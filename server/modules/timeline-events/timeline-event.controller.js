import { TimelineEvent } from './timeline-event.model.js';
import { AppError, catchAsync } from '../../middleware/error.middleware.js';

const listTimelineEvents = catchAsync(async (req, res) => {
  const events = await TimelineEvent.find({ userId: req.user.userId }).sort({
    date: -1,
  });

  res.status(200).json({
    status: 'success',
    results: events.length,
    data: events,
  });
});

const getTimelineEvent = catchAsync(async (req, res) => {
  const event = await TimelineEvent.findOne({
    _id: req.params.id,
    userId: req.user.userId,
  });

  if (!event) throw new AppError('Timeline event not found.', 404);

  res.status(200).json({ status: 'success', data: event });
});

const createTimelineEvent = catchAsync(async (req, res) => {
  const { eventType, title, date, referenceId } = req.body;

  if (!eventType || !title) {
    throw new AppError('Event type and title are required.', 400);
  }

  const event = await TimelineEvent.create({
    userId: req.user.userId,
    eventType,
    title,
    date: date || Date.now(),
    referenceId: referenceId || undefined,
  });

  res.status(201).json({ status: 'success', data: event });
});

const updateTimelineEvent = catchAsync(async (req, res) => {
  const { eventType, title, date, referenceId } = req.body;

  const updateFields = {};
  if (eventType !== undefined) updateFields.eventType = eventType;
  if (title !== undefined) updateFields.title = title;
  if (date !== undefined) updateFields.date = date;
  if (referenceId !== undefined) updateFields.referenceId = referenceId;

  const event = await TimelineEvent.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    updateFields,
    { new: true, runValidators: true }
  );

  if (!event) throw new AppError('Timeline event not found.', 404);

  res.status(200).json({ status: 'success', data: event });
});

const deleteTimelineEvent = catchAsync(async (req, res) => {
  const event = await TimelineEvent.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.userId,
  });

  if (!event) throw new AppError('Timeline event not found.', 404);

  res.status(204).end();
});

export {
  listTimelineEvents,
  getTimelineEvent,
  createTimelineEvent,
  updateTimelineEvent,
  deleteTimelineEvent,
};
