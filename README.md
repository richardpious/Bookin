# Project Installation Guide

This guide covers how to set up your environment for the project, including dependencies for simulation, documentation, and web tools.

## Prerequisites

Ensure you have the following installed on your system:
- [Python 3.x](https://www.python.org/downloads/)
- [Node.js (LTS version)](https://nodejs.org/)

---

## Dependancies 

The project relies on both Python and js dependancies, it is recommended to install inside a virtual environment.

```bash
# Create and activate the virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install the Python dependancies
pip install -r requirements.txt

```bash
# Install all js dependencies
npm install
```

## Getting Started

Once dependencies are installed:
1. **Activate your environment**: Always ensure your `.venv` is active when running Python scripts.
2. **Start the frontend and backend servers**: 