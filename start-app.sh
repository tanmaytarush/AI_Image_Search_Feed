#!/bin/bash

echo "🚀 Starting Interior Image Search Application"
echo ""

# Check if backend is running
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "📡 Starting Backend Server..."
    echo "   Backend will be available at: http://localhost:3000"
    echo "   API Documentation: http://localhost:3000/api"
    echo ""
    
    # Start backend in background
    cd "$(dirname "$0")"
    npm start &
    BACKEND_PID=$!
    
    # Wait for backend to start
    echo "⏳ Waiting for backend to start..."
    sleep 5
    
    # Check if backend started successfully
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "✅ Backend is running!"
    else
        echo "❌ Backend failed to start"
        exit 1
    fi
else
    echo "✅ Backend is already running at http://localhost:3000"
fi

echo ""

# Check if frontend is running
if ! curl -s http://localhost:5173 > /dev/null; then
    echo "🎨 Starting Frontend Server..."
    echo "   Frontend will be available at: http://localhost:5173"
    echo ""
    
    # Start frontend in background
    cd "$(dirname "$0")/frontend"
    npm run dev &
    FRONTEND_PID=$!
    
    # Wait for frontend to start
    echo "⏳ Waiting for frontend to start..."
    sleep 3
    
    # Check if frontend started successfully
    if curl -s http://localhost:5173 > /dev/null; then
        echo "✅ Frontend is running!"
    else
        echo "❌ Frontend failed to start"
        exit 1
    fi
else
    echo "✅ Frontend is already running at http://localhost:5173"
fi

echo ""
echo "🎉 Application is ready!"
echo ""
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:3000"
echo "📚 API Docs: http://localhost:3000/api"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait 