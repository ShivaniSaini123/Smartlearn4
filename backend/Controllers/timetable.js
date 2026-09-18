const Timetable = require('../models/TimeTableSchema'); // Replace with the correct path to your model

// Create a new timetable or replace an existing one
exports.createOrUpdateTimetable = async (req, res) => {
  try {
    const { semester, branch, schedule } = req.body;

    let timetable = await Timetable.findOne({ semester, branch });

    if (timetable) {

      // Update existing timetable properly
      Object.assign(timetable, schedule);

      await timetable.save();

      res.status(200).json({
        message: 'Timetable updated successfully',
        timetable
      });

    } else {

      timetable = new Timetable({
        semester,
        branch,
        ...schedule
      });

      await timetable.save();

      res.status(201).json({
        message: 'Timetable created successfully',
        timetable
      });
    }

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Server error',
      error
    });
  }
};
// Update a specific day's schedule
exports.updateDaySchedule = async (req, res) => {
  try {
    const { semester, branch, day } = req.params; // e.g., 'monday', 'tuesday', etc.
    const { subjects } = req.body; // Array of subjects for the specified day

    // Find the timetable by semester and branch
    const timetable = await Timetable.findOne({ semester, branch });

    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }

    // Update the specified day with new subjects
    timetable[day] = subjects;
    await timetable.save();

    res.status(200).json({ message: `${day} schedule updated successfully`, timetable });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
exports.getTt = async (req, res) => {
  try {
    const { semester, branch } = req.params;

    const timetable = await Timetable.findOne({
      semester: semester.trim(),
      branch: branch.trim(),
    }).lean();

    if (!timetable) {
      return res.status(404).json({
        message: "Timetable not found",
      });
    }

    return res.status(200).json(timetable);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};