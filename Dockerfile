# Use an official Ubuntu base image
FROM ubuntu:22.04

# Set non-interactive mode for apt to avoid prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Set the working directory
WORKDIR /workspace

# Install system dependencies: Python, Node.js, ripgrep, and build tools
# Added flex and bison for Booksim just in case they are needed.
RUN apt-get update && apt-get install -y jq\
    python3 \
    python3-pip \
    curl \
    ripgrep \
    build-essential \
    flex \
    bison \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (e.g., v20)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and requirements.txt first to leverage Docker cache
# Copy the platform and plugins directories early so npm workspaces can find their package.json files
COPY package.json requirements.txt ./
COPY platform/ ./platform/
COPY plugins/ ./plugins/

WORKDIR /workspace/plugins/tool-approval
RUN npm install

WORKDIR /workspace/plugins/file-preview
RUN npm install

# Return to the project root
WORKDIR /workspace

# Install Python dependencies globally
# Ubuntu 22.04 pip doesn't need or support --break-system-packages
RUN pip3 install --no-cache-dir -r requirements.txt
# Install Node dependencies
RUN npm install

# Install Openclaw using the official headless installer script
RUN curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard

# Copy Booksim and compile it inside the src directory
COPY booksim/ ./booksim/
RUN cd booksim/src && make

# Copy the rest of the application files
COPY docs/ ./docs/
COPY logs/ ./logs/
COPY configs/ ./configs/
COPY agent/ ./agent/
COPY setup_plugins.sh start_servers.sh entrypoint.sh ./

# Make scripts executable
RUN chmod +x setup_plugins.sh start_servers.sh entrypoint.sh

# Expose ports for FastAPI (e.g., 8000) and Vite (e.g., 5173)
EXPOSE 8000 5173

# Set the entrypoint
CMD ["./entrypoint.sh"]
