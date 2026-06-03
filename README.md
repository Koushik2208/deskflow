# Deskflow

Co-working space management backend.

## Overview

Deskflow is a backend application built with Node.js and Express to manage co-working spaces. It provides RESTful APIs to handle operations, utilizing MongoDB for data storage and JSON Web Tokens for authentication.

## Tech Stack

- **Node.js** - JavaScript runtime environment.
- **Express.js** - Web framework for Node.js.
- **MongoDB & Mongoose** - Database and Object Data Modeling (ODM) library.
- **JWT (JSON Web Tokens)** - For authentication and authorization.
- **Bcryptjs** - For secure password hashing.

## Getting Started

### Prerequisites

- Node.js installed
- MongoDB instance running locally or via a cloud service like MongoDB Atlas

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```bash
   cd deskflow
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Configure the environment variables by creating a `.env` file in the root directory. You will likely need to set variables such as `PORT` and a MongoDB connection string.

### Running the Application

To start the server in development mode (with auto-reload via nodemon):
```bash
npm run dev
```

To start the server in production mode:
```bash
npm start
```

## Project Structure

- `src/` - Source code, typically containing controllers, models, routes, and services.
- `tests/` - Test files.
- `server.js` - Application entry point.
- `postman/` - API documentation or Postman collections.

## License

ISC
