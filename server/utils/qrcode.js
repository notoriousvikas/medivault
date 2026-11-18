/**
 * QR Code Generator Utility
 * Dynamically uses the 'qrcode' npm package if installed,
 * or seamlessly falls back to a built-in pure JavaScript QR Code (Model 2)
 * generator that outputs clean, scalable, scannable SVG and Data URLs.
 */

// --- Pure JavaScript Standard QR Code Generator (Zero-dependency fallback) ---

const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = val;
    GF256_EXP[i + 255] = val;
    GF256_LOG[val] = i;
    val = (val << 1) ^ (val & 0x80 ? 0x11d : 0);
  }
})();

function gfMultiply(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function rsGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const factor = [1, GF256_EXP[i]];
    const newPoly = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      for (let k = 0; k < factor.length; k++) {
        newPoly[j + k] ^= gfMultiply(poly[j], factor[k]);
      }
    }
    poly = newPoly;
  }
  return poly;
}

function calculateReedSolomon(data, ecLength) {
  const genPoly = rsGeneratorPoly(ecLength);
  const result = new Array(ecLength).fill(0);

  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ result[0];
    result.shift();
    result.push(0);
    for (let j = 0; j < ecLength; j++) {
      result[j] ^= gfMultiply(genPoly[j + 1], factor);
    }
  }

  return result;
}

// Version table capacities for Level M (approx byte capacities)
const VERSION_CAPACITIES_M = [
  { version: 1, totalCodewords: 26, ecCodewords: 10, dataCodewords: 16 },
  { version: 2, totalCodewords: 44, ecCodewords: 16, dataCodewords: 28 },
  { version: 3, totalCodewords: 70, ecCodewords: 26, dataCodewords: 44 },
  { version: 4, totalCodewords: 100, ecCodewords: 36, dataCodewords: 64 },
  { version: 5, totalCodewords: 134, ecCodewords: 48, dataCodewords: 86 },
  { version: 6, totalCodewords: 172, ecCodewords: 64, dataCodewords: 108 },
  { version: 7, totalCodewords: 196, ecCodewords: 72, dataCodewords: 124 },
  { version: 8, totalCodewords: 242, ecCodewords: 88, dataCodewords: 154 },
];

function selectVersion(dataLen) {
  // Byte mode overhead: 4 bits mode + 8 bits length indicator = 12 bits = 2 bytes
  const neededDataBytes = dataLen + 2;
  for (const v of VERSION_CAPACITIES_M) {
    if (v.dataCodewords >= neededDataBytes) {
      return v;
    }
  }
  return VERSION_CAPACITIES_M[VERSION_CAPACITIES_M.length - 1];
}

const ALIGNMENT_PATTERN_POSITIONS = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
];

function createQRMatrix(versionInfo, text) {
  const { version, dataCodewords, ecCodewords } = versionInfo;
  const size = 17 + 4 * version;

  // Initialize matrix: null = unset, true = dark, false = light
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const isReserved = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r, c, isDark, reserved = true) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = isDark;
      if (reserved) isReserved[r][c] = true;
    }
  }

  // 1. Finder patterns (7x7) + Separators
  const finders = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];

  for (const [row, col] of finders) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr >= 0 && mr < size && mc >= 0 && mc < size) {
          if (r >= 0 && r < 7 && c >= 0 && c < 7) {
            const isDark =
              r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            setModule(mr, mc, isDark);
          } else {
            setModule(mr, mc, false); // separator
          }
        }
      }
    }
  }

  // 2. Timing patterns (row 6 & col 6)
  for (let i = 8; i < size - 8; i++) {
    const isDark = i % 2 === 0;
    if (matrix[6][i] === null) setModule(6, i, isDark);
    if (matrix[i][6] === null) setModule(i, 6, isDark);
  }

  // 3. Dark module
  setModule(4 * version + 9, 8, true);

  // 4. Alignment patterns for Version >= 2
  const alignPos = ALIGNMENT_PATTERN_POSITIONS[version] || [];
  for (const r of alignPos) {
    for (const c of alignPos) {
      if (isReserved[r][c]) continue; // Skip finder overlap
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isDark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setModule(r + dr, c + dc, isDark);
        }
      }
    }
  }

  // 5. Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isReserved[8][i] = true;
      isReserved[i][8] = true;
    }
  }
  for (let i = size - 8; i < size; i++) {
    isReserved[8][i] = true;
    isReserved[i][8] = true;
  }

  // 6. Encode Data (Byte mode: 0100)
  const textBytes = Buffer.from(text, 'utf-8');
  const bits = [];

  function appendBits(val, numBits) {
    for (let i = numBits - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  appendBits(0b0100, 4); // Byte mode indicator
  appendBits(textBytes.length, 8); // Character count indicator
  for (const b of textBytes) {
    appendBits(b, 8);
  }

  // Terminator
  const totalDataBits = dataCodewords * 8;
  const termLen = Math.min(4, totalDataBits - bits.length);
  appendBits(0, termLen);

  // Pad to 8-bit boundary
  while (bits.length % 8 !== 0 && bits.length < totalDataBits) {
    bits.push(0);
  }

  // Convert bits to byte codewords
  const dataCodewordsArr = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | (bits[i + b] || 0);
    }
    dataCodewordsArr.push(byteVal);
  }

  // Pad bytes (0xEC, 0x11)
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (dataCodewordsArr.length < dataCodewords) {
    dataCodewordsArr.push(padBytes[padIdx % 2]);
    padIdx++;
  }

  // 7. Error correction calculation
  const ecCodewordsArr = calculateReedSolomon(dataCodewordsArr, ecCodewords);
  const finalCodewords = dataCodewordsArr.concat(ecCodewordsArr);

  // Convert final codewords to bit stream
  const finalBits = [];
  for (const byte of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      finalBits.push((byte >> i) & 1);
    }
  }

  // 8. Place data bits in matrix (zig-zag 2-column from bottom right)
  let bitIndex = 0;
  let dir = -1; // -1: up, +1: down
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing line
    const rStart = dir === -1 ? size - 1 : 0;
    const rEnd = dir === -1 ? -1 : size;

    for (let r = rStart; r !== rEnd; r += dir) {
      for (const c of [right, right - 1]) {
        if (!isReserved[r][c]) {
          const bit = bitIndex < finalBits.length ? finalBits[bitIndex++] : 0;
          // Apply mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = (bit ^ (mask ? 1 : 0)) === 1;
        }
      }
    }
    dir = -dir;
  }

  // 9. Format Info: Level M, Mask 0
  // Mask pattern 0 (000), Level M (00) -> 00 000 = 00000 -> with BCH + 0x5412 XOR = 101010000010010
  const FORMAT_M_MASK0 = 0b101010000010010;
  const formatBits = [];
  for (let i = 14; i >= 0; i--) {
    formatBits.push((FORMAT_M_MASK0 >> i) & 1);
  }

  // Place format info along top-left finder and split on top-right & bottom-left
  const formatCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatCoords[i];
    matrix[r][c] = formatBits[i] === 1;
  }

  // Place copy on edges
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = formatBits[i] === 1;
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 8 + i] = formatBits[7 + i] === 1;
  }

  return matrix;
}

/**
 * Render matrix to standard SVG string
 */
function renderMatrixToSVG(matrix, { margin = 4, size = 300 } = {}) {
  const moduleCount = matrix.length;
  const viewBoxSize = moduleCount + margin * 2;

  let rects = '';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${size}" height="${size}" fill="#000000" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${rects}
</svg>`;
}

/**
 * Generate QR code as SVG string.
 */
async function generateQRCodeSVG(text, options = {}) {
  // Try using the 'qrcode' library if available
  try {
    const qrcodeModule = await import('qrcode');
    const QRCode = qrcodeModule.default || qrcodeModule;
    if (QRCode && typeof QRCode.toString === 'function') {
      return await QRCode.toString(text, { type: 'svg', margin: 2, ...options });
    }
  } catch {
    // Fall back to built-in generator
  }

  const versionInfo = selectVersion(Buffer.byteLength(text, 'utf-8'));
  const matrix = createQRMatrix(versionInfo, text);
  return renderMatrixToSVG(matrix, options);
}

/**
 * Generate QR code as a base64 Data URL.
 */
async function generateQRCodeDataURL(text, options = {}) {
  try {
    const qrcodeModule = await import('qrcode');
    const QRCode = qrcodeModule.default || qrcodeModule;
    if (QRCode && typeof QRCode.toDataURL === 'function') {
      return await QRCode.toDataURL(text, { margin: 2, ...options });
    }
  } catch {
    // Fall back to built-in generator
  }

  const svg = await generateQRCodeSVG(text, options);
  const base64SVG = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64SVG}`;
}

export { generateQRCodeSVG, generateQRCodeDataURL };
