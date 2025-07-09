// server.js - Express Backend with MongoDB
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Task Schema
const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
taskSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

taskSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: Date.now() });
    next();
});

const Task = mongoose.model('Task', taskSchema);

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation middleware
const validateTask = (req, res, next) => {
    const { title, priority, status } = req.body;
    
    if (!title || title.trim().length === 0) {
        return res.status(400).json({ 
            error: 'Title is required and cannot be empty' 
        });
    }
    
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
        return res.status(400).json({ 
            error: 'Priority must be low, medium, or high' 
        });
    }
    
    if (status && !['pending', 'in-progress', 'completed'].includes(status)) {
        return res.status(400).json({ 
            error: 'Status must be pending, in-progress, or completed' 
        });
    }
    
    next();
};

// Routes

// GET /api/tasks - Get all tasks with optional filtering
app.get('/api/tasks', asyncHandler(async (req, res) => {
    const { status, priority, sortBy = 'createdAt', order = 'desc' } = req.query;
    
    // Build filter object
    const filter = {};
    if (status && status !== 'all') {
        filter.status = status;
    }
    if (priority && priority !== 'all') {
        filter.priority = priority;
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;
    
    const tasks = await Task.find(filter).sort(sort);
    
    res.json({
        success: true,
        data: tasks,
        count: tasks.length
    });
}));

// GET /api/tasks/:id - Get single task
app.get('/api/tasks/:id', asyncHandler(async (req, res) => {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
        return res.status(404).json({
            success: false,
            error: 'Task not found'
        });
    }
    
    res.json({
        success: true,
        data: task
    });
}));

// POST /api/tasks - Create new task
app.post('/api/tasks', validateTask, asyncHandler(async (req, res) => {
    const { title, description, priority, status } = req.body;
    
    const task = new Task({
        title: title.trim(),
        description: description ? description.trim() : '',
        priority: priority || 'medium',
        status: status || 'pending'
    });
    
    const savedTask = await task.save();
    
    res.status(201).json({
        success: true,
        data: savedTask,
        message: 'Task created successfully'
    });
}));

// PUT /api/tasks/:id - Update task
app.put('/api/tasks/:id', validateTask, asyncHandler(async (req, res) => {
    const { title, description, priority, status } = req.body;
    
    const updateData = {
        title: title.trim(),
        description: description ? description.trim() : '',
        priority: priority || 'medium',
        status: status || 'pending'
    };
    
    const task = await Task.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    );
    
    if (!task) {
        return res.status(404).json({
            success: false,
            error: 'Task not found'
        });
    }
    
    res.json({
        success: true,
        data: task,
        message: 'Task updated successfully'
    });
}));

// DELETE /api/tasks/:id - Delete task
app.delete('/api/tasks/:id', asyncHandler(async (req, res) => {
    const task = await Task.findByIdAndDelete(req.params.id);
    
    if (!task) {
        return res.status(404).json({
            success: false,
            error: 'Task not found'
        });
    }
    
    res.json({
        success: true,
        data: task,
        message: 'Task deleted successfully'
    });
}));

// GET /api/stats - Get task statistics
app.get('/api/stats', asyncHandler(async (req, res) => {
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const pendingTasks = await Task.countDocuments({ status: 'pending' });
    const inProgressTasks = await Task.countDocuments({ status: 'in-progress' });
    
    const priorityStats = await Task.aggregate([
        {
            $group: {
                _id: '$priority',
                count: { $sum: 1 }
            }
        }
    ]);
    
    res.json({
        success: true,
        data: {
            total: totalTasks,
            completed: completedTasks,
            pending: pendingTasks,
            inProgress: inProgressTasks,
            priority: priorityStats.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        }
    });
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: errors
        });
    }
    
    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            error: 'Invalid ID format'
        });
    }
    
    // Default error
    res.status(500).json({
        success: false,
        error: 'Internal Server Error'
    });
});

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

module.exports = app;