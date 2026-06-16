# Project Installation Guide

This guide covers how to set up your environment for the project, including dependencies for simulation, documentation, and web tools.

## Prerequisites

Ensure you have the following installed on your system:
- [Git](https://git-scm.com/)
- [Python 3.x](https://www.python.org/downloads/)
- [Node.js (LTS version)](https://nodejs.org/)

---

## 1. Web & Documentation Dependencies (Node.js)

The project uses Node.js for documentation tools and web-based utilities. To install the required packages:

```bash
# Navigate to the project root
cd <project_root>

# Install all dependencies defined in package-lock.json
npm install
```

---

## 2. Simulation Dependencies (Python)

The project relies on a virtual environment for Python dependencies.

```bash
# Create and activate the virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt
```
*(Note: If `requirements.txt` does not exist, please ensure you have the necessary packages for your specific simulator scripts installed.)*

---

## 3. OpenClaw Dependencies

If you are working with the OpenClaw components, ensure your submodules and C++ compilation environment are prepared:

```bash
# Initialize submodules (if applicable)
git submodule update --init --recursive

# For C++ components (BookSim/OpenClaw), ensure you have a compiler
# (e.g., g++, clang) and make installed.
cd booksim
make
```

---

## Getting Started

Once dependencies are installed:
1. **Activate your environment**: Always ensure your `.venv` is active when running Python scripts.
2. **Verify Installation**: Run the provided tests or check the documentation index in `docs/index.md`.
