const Task = require('../models/Task');

// Helper to get company ID of the user
function getUserCompanyId(req) {
  if (req.user.companyId && req.user.companyId._id) {
    return req.user.companyId._id;
  }
  return req.user.companyId;
}

// Fetch list of tasks
const getTasks = async (req, res) => {
  try {
    let taskFilter = {};
    if (req.query.projectId) {
      taskFilter.projectId = req.query.projectId;
    }

    const userRole = req.user.role;
    if (userRole !== 'SuperAdmin' && userRole !== 'Government') {
      taskFilter.organisationId = getUserCompanyId(req);
    }
    
    // Employee sees only their tasks
    if (userRole === 'Employee') {
      taskFilter.assignedTo = req.user._id;
    }

    const tasksList = await Task.find(taskFilter)
      .populate('assignedTo', 'name email designation')
      .populate('createdBy', 'name')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json(tasksList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
};

// Create a new task
const createTask = async (req, res) => {
  try {
    const orgId = getUserCompanyId(req);
    const { projectId, title, description, assignedTo, priority, dueDate } = req.body;

    const createdTask = await Task.create({
      projectId: projectId,
      organisationId: orgId,
      title: title,
      description: description || '',
      assignedTo: assignedTo || null,
      priority: priority || 'Medium',
      dueDate: dueDate || undefined,
      createdBy: req.user._id
    });
    
    const populated = await createdTask.populate('assignedTo', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating task' });
  }
};

// Update a task details
const updateTask = async (req, res) => {
  try {
    const targetTask = await Task.findById(req.params.id);
    if (!targetTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const userRole = req.user.role;
    
    if (userRole === 'Employee') {
      // Employees can only update task status for tasks assigned to them
      if (targetTask.assignedTo?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only update tasks assigned to you' });
      }
      
      targetTask.status = req.body.status || targetTask.status;
      if (targetTask.status === 'Done' && !targetTask.completedAt) {
        targetTask.completedAt = new Date();
      }
    } else {
      // Managers can update all fields
      const taskFields = ['title', 'description', 'assignedTo', 'status', 'priority', 'dueDate'];
      for (let i = 0; i < taskFields.length; i++) {
        const fieldName = taskFields[i];
        if (req.body[fieldName] !== undefined) {
          targetTask[fieldName] = req.body[fieldName];
        }
      }
      if (targetTask.status === 'Done' && !targetTask.completedAt) {
        targetTask.completedAt = new Date();
      }
    }

    const updatedTask = await targetTask.save();
    res.json(updatedTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating task' });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting task' });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask
};
