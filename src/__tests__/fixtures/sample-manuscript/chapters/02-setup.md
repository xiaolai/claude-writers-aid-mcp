# Development Environment Setup

<!-- Intentional structure issue: skipping H2, going straight to H3 -->

### Installing Node.js

Node.js is a JavaScript runtime built on Chrome's V8 engine. You'll need it for running JavaScript outside the browser and managing packages with npm.

Download Node.js from the official website. The LTS version is recommended for most users. After installation, verify by running:

```bash
node --version
npm --version
```

## Package Management

### npm Basics

npm is the default package manager for Node.js. You can use it to install packages, manage dependencies, and run scripts.

### Setup

Create a new project:

```bash
mkdir my-project
cd my-project
npm init -y
```

## Version Control

### Git Installation

<!-- Duplicate heading coming up -->

#### Installation

Git is essential for version control. Download from git-scm.com and install.

#### Installation

<!-- This is a duplicate heading - intentional issue -->

Configure git with your details:

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

Note: Use your email for git configuration. Some prefer to use e-mail addresses that match their GitHub account. Make sure your Email is correct.

<!-- Terminology inconsistencies above: email, e-mail, Email -->

## Code Editor

##### Visual Studio Code

<!-- Intentional issue: H5 is too deeply nested -->

VS Code is a popular, free code editor with excellent support for web development. It includes features like IntelliSense, debugging, and git integration.

###### Extensions

<!-- Intentional issue: H6 is even deeper -->

Install these essential extensions:

- ESLint
- Prettier
- Live Server
* GitLens
- Debugger for Chrome

<!-- Mixed list markers intentional issue -->

## Database Setup

You'll need a data-base for storing application data. We recommend PostgreSQL or MongoDB. The database you choose depends on your application requirements.

<!-- Terminology issue: data-base vs database -->

### PostgreSQL Installation

Download PostgreSQL from postgresql.org. During installation, remember your postgres user password. You'll need it for database connections.

## API Development Tools

For testing API endpoints, install Postman or use curl. The api testing is crucial for backend development. Make sure your API keys are secure.

<!-- Terminology issues: API vs api -->

## Configuration Files

Create a .env file for environment variables:

```env
DATABASE_URL=postgresql://localhost:5432/myapp
Api_KEY=your-api-key-here
PORT=3000
```

<!-- Inconsistent API/Api casing -->

<!-- TODO: Add Docker setup instructions -->
<!-- FIXME: The DATABASE_URL example needs updating -->
<!-- WIP: Redis configuration section -->

## Troubleshooting

### Common Issues

**Problem:** npm install fails
**Solution:** Clear npm cache and try again

**Problem:** git command not found
**Solution:** Restart terminal after installation

**Problem:** Port 3000 already in use
**Solution:** Kill the process or use a different port

## Next Steps

Once your environment is ready, proceed to [HTML Basics](missing-chapter.md). You can also review our [API Guidelines](../appendix/api-guide.md) for best practices.

<!-- Intentional broken link to missing-chapter.md -->

---

**Previous:** [Introduction](01-introduction.md) | **Next:** [HTML Basics](03-html-basics.md)
