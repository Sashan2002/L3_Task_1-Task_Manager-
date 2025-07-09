// scripts/seed.js - Database seeding script
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Task Schema (same as in server.js)
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

const Task = mongoose.model('Task', taskSchema);

// Sample data
const sampleTasks = [
    {
        title: 'Setup Development Environment',
        description: 'Install Node.js, MongoDB, and configure development tools',
        priority: 'high',
        status: 'completed'
    },
    {
        title: 'Create API Documentation',
        description: 'Write comprehensive API documentation using Swagger/OpenAPI',
        priority: 'medium',
        status: 'in-progress'
    },
    {
        title: 'Implement User Authentication',
        description: 'Add JWT-based authentication system with login/register functionality',
        priority: 'high',
        status: 'pending'
    },
    {
        title: 'Write Unit Tests',
        description: 'Create comprehensive unit tests for all API endpoints',
        priority: 'medium',
        status: 'pending'
    },
    {
        title: 'Setup CI/CD Pipeline',
        description: 'Configure automated testing and deployment pipeline',
        priority: 'low',
        status: 'pending'
    },
    {
        title: 'Optimize Database Queries',
        description: 'Add indexes and optimize MongoDB queries for better performance',
        priority: 'medium',
        status: 'in-progress'
    },
    {
        title: 'Add Error Logging',
        description: 'Implement comprehensive error logging and monitoring',
        priority: 'low',
        status: 'completed'
    },
    {
        title: 'Create Frontend Components',
        description: 'Build React components for task management interface',
        priority: 'high',
        status: 'in-progress'
    },
    {
        title: 'Setup Production Environment',
        description: 'Configure production server with proper security measures',
        priority: 'high',
        status: 'pending'
    },
    {
        title: 'Implement Real-time Updates',
        description: 'Add WebSocket support for real-time task updates',
        priority: 'low',
        status: 'pending'
    }
];

async function seedDatabase() {
    try {
        // Connect to MongoDB
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager';
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('Connected to MongoDB');
        
        // Clear existing data
        await Task.deleteMany({});
        console.log('Cleared existing tasks');
        
        // Insert sample data
        const tasks = await Task.insertMany(sampleTasks);
        console.log(`Inserted ${tasks.length} sample tasks`);
        
        // Display inserted tasks
        console.log('\nSample tasks created:');
        tasks.forEach((task, index) => {
            console.log(`${index + 1}. ${task.title} (${task.priority} priority, ${task.status})`);
        });
        
        console.log('\nDatabase seeding completed successfully!');
        
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        // Close connection
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
}

// Run the seed function
seedDatabase();