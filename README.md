## Chat Application

A real-time chat application built with frontend and backend technologies to explore different communication methods between clients and servers, including Polling and WebSockets.

## Project Overview

This project was developed as part of the CodeYourFuture coursework focused on building and deploying distributed applications.

The application allows multiple users to send and receive messages in real time through a shared chat interface. The project explores two different approaches for client-server communication:

Polling – the client repeatedly requests new messages from the server at regular intervals.
WebSockets – a persistent connection that enables instant, bidirectional communication between client and server.

## Features
- Send and receive chat messages
- Shared real-time chat room
- Automatic message updates
- Multiple users supported simultaneously
- Real-time communication using WebSockets
- Polling-based message synchronization
- Responsive and user-friendly interface

## Technologies Used
Frontend
- JavaScript
- HTML
- CSS

Backend
- Node.js
- Express.js
- WebSocket (ws)

## How It Works
## Polling

The frontend periodically sends HTTP requests to the backend to check for new messages.

Advantages

Simple to implement
Works with standard HTTP

Limitations

Small delay between updates
More unnecessary network requests

## WebSockets

The frontend opens a persistent connection with the backend server, allowing messages to be pushed instantly to all connected users.

Advantages

Real-time communication
More efficient for live applications
Lower latency

Limitations

Slightly more complex implementation

## Learning Outcomes

Through this project, we learned how to:

- Build and deploy frontend and backend applications
- Manage real-time communication between multiple users
- Compare Polling vs WebSocket architectures
- Handle asynchronous events and state updates
- Structure full-stack applications
- Debug and test network-based features

## Future Improvements

- User authentication
- Private chat rooms
- Online/offline user status
- Message persistence with a database
- Typing indicators
- Improved UI/UX
