const Project = require('../models/Project');
const Progress = require('../models/Progress');
const Task = require('../models/Task');
const DailyUpdate = require('../models/DailyUpdate');

// helper function to extract user's company id
function findUserCompanyId(req) {
  if (req.user.companyId && req.user.companyId._id) {
    return req.user.companyId._id;
  }
  return req.user.companyId;
}

// Fetch projects list
const getProjects = async (req, res) => {
  try {
    let filterQuery = {};
    const userRole = req.user.role;

    if (userRole === 'SuperAdmin' || userRole === 'Government') {
      // Government sees all projects
    } else if (userRole === 'Manager') {
      // Managers see projects assigned to them
      filterQuery.assignedManagers = req.user._id;
    } else {
      const orgId = findUserCompanyId(req);
      filterQuery.organisationId = orgId;

      // Site Engineers only see assigned projects
      if (userRole === 'Employee') {
        filterQuery.assignedEngineers = req.user._id;
      }
    }

    const projectsList = await Project.find(filterQuery)
      .populate('assignedManagers', 'name email')
      .populate('assignedEngineers', 'name email designation')
      .populate('organisationId', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    // Fetch progress data and merge it
    const progressesList = await Progress.find(
      filterQuery.organisationId ? { organisationId: filterQuery.organisationId } : {}
    );

    const mergedList = [];
    for (let i = 0; i < projectsList.length; i++) {
      const currentProj = projectsList[i];
      const matchProg = progressesList.find((prog) => {
        return (
          prog.projectId?.toString() === currentProj._id.toString() ||
          prog.companyId?.toString() === currentProj._id.toString()
        );
      });

      const projObj = currentProj.toObject();
      projObj.progressData = matchProg || {
        investmentSpent: 0,
        employeesCurrent: 0,
        completionPercentage: currentProj.completionPercentage || 0
      };
      
      mergedList.push(projObj);
    }

    res.json(mergedList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching projects' });
  }
};

// Fetch single project details with tasks and updates
const getProject = async (req, res) => {
  try {
    const singleProj = await Project.findById(req.params.id)
      .populate('assignedManagers', 'name email phone designation')
      .populate('assignedEngineers', 'name email phone designation')
      .populate('organisationId', 'name industry')
      .populate('createdBy', 'name');

    if (!singleProj) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Role-based access guard for non-Government / non-SuperAdmin
    const userRole = req.user.role;
    if (userRole !== 'SuperAdmin' && userRole !== 'Government') {
      const orgId = findUserCompanyId(req);
      const projOrgId = singleProj.organisationId?._id || singleProj.organisationId;
      
      if (projOrgId.toString() !== orgId.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (userRole === 'Employee') {
        const isAssigned = singleProj.assignedEngineers.some((eng) => {
          return eng._id?.toString() === req.user._id.toString();
        });
        if (!isAssigned) {
          return res.status(403).json({ message: 'You are not assigned to this project' });
        }
      }
    }

    const tasksList = await Task.find({ projectId: singleProj._id })
      .populate('assignedTo', 'name email');
      
    const recentUpdatesList = await DailyUpdate.find({ projectId: singleProj._id })
      .populate('submittedBy', 'name')
      .sort({ date: -1 })
      .limit(10);

    const resultObj = singleProj.toObject();
    resultObj.tasks = tasksList;
    resultObj.recentUpdates = recentUpdatesList;

    res.json(resultObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching project' });
  }
};

// Create a project manually (Legacy option)
const createProject = async (req, res) => {
  try {
    const orgId = findUserCompanyId(req);
    const {
      projectName, clientName, clientContact, location, description,
      investmentCommitted, expense, startDate, expectedEndDate,
      projectStatus, assignedEngineers, employeesExpected, companyName
    } = req.body;

    const newProject = await Project.create({
      organisationId: orgId,
      name: projectName,
      clientName: clientName || '',
      clientContact: clientContact || '',
      location: location || '',
      description: description || '',
      investmentCommitted: investmentCommitted || 0,
      expense: expense || 0,
      startDate: startDate || undefined,
      expectedEndDate: expectedEndDate || undefined,
      projectStatus: projectStatus || 'Not Started',
      completionPercentage: 0,
      assignedManagers: [req.user._id],
      assignedEngineers: assignedEngineers || [],
      employeesExpected: employeesExpected || 0,
      companyName: companyName || '',
      createdBy: req.user._id
    });

    res.status(201).json(newProject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating project' });
  }
};

// Update an existing project
const updateProject = async (req, res) => {
  try {
    const currentProj = await Project.findById(req.params.id);
    if (!currentProj) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check organization access
    const userRole = req.user.role;
    if (userRole !== 'SuperAdmin' && userRole !== 'Government') {
      const orgId = findUserCompanyId(req);
      const projOrgId = currentProj.organisationId?._id || currentProj.organisationId;
      if (projOrgId.toString() !== orgId.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const updatableFields = [
      'projectName', 'clientName', 'clientContact', 'location', 'description',
      'investmentCommitted', 'expense', 'startDate', 'expectedEndDate',
      'projectStatus', 'completionPercentage', 'assignedManagers',
      'assignedEngineers', 'employeesExpected', 'companyName'
    ];

    for (let i = 0; i < updatableFields.length; i++) {
      const field = updatableFields[i];
      if (req.body[field] !== undefined) {
        currentProj[field] = req.body[field];
      }
    }

    const updatedProject = await currentProj.save();
    res.json(updatedProject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating project' });
  }
};

// Delete a project
const deleteProject = async (req, res) => {
  try {
    const currentProj = await Project.findById(req.params.id);
    if (!currentProj) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const userRole = req.user.role;
    if (userRole !== 'SuperAdmin' && userRole !== 'Government') {
      const orgId = findUserCompanyId(req);
      const projOrgId = currentProj.organisationId?._id || currentProj.organisationId;
      if (projOrgId.toString() !== orgId.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Delete tasks, updates, progress entries first
    await Task.deleteMany({ projectId: currentProj._id });
    await DailyUpdate.deleteMany({ projectId: currentProj._id });
    await Progress.deleteMany({ projectId: currentProj._id });
    
    // delete the project
    await Project.deleteOne({ _id: currentProj._id });

    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting project' });
  }
};

// Assign Site Engineer to project
const assignEngineer = async (req, res) => {
  try {
    const { engineerId } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const assignedIds = project.assignedEngineers.map(e => e.toString());
    if (!assignedIds.includes(engineerId)) {
      project.assignedEngineers.push(engineerId);
      await project.save();
    }

    res.json({ message: 'Engineer assigned', project: project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error assigning engineer' });
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  assignEngineer
};
