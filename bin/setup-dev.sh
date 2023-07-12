#!/bin/bash

# Automatically find the script's own directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Construct the path to mdev dynamically
MDEV_DIR="$SCRIPT_DIR/dev"
# Check if mdev directory exists
if [ -d "$MDEV_DIR" ]; then
    CURRENT_SHELL=$(basename "$SHELL")
    PROFILE=""
    # Check if the directory is already in the PATH
    if [[ ":$PATH:" != *":$MDEV_DIR:"* ]]; then
        # Add mdev directory to the PATH for current session
        export PATH="$MDEV_DIR:$PATH"
        # Detect the current shell

        # Add mdev directory to the PATH permanently for the appropriate shell
        if [ "$CURRENT_SHELL" = "bash" ]; then
            PROFILE="$HOME/.bashrc"
            echo "export PATH=\"\$PATH:$MDEV_DIR\"" >> $PROFILE

        elif [ "$CURRENT_SHELL" = "zsh" ]; then
            PROFILE="$HOME/.zshrc"
            echo "export PATH=\"\$PATH:$MDEV_DIR\"" >> $PROFILE

        else
            echo "Unsupported shell. Please add the directory to your shell's configuration file manually."
            exit 1
        fi
    else
        echo "mdev directory is already in the PATH"
        exit 1
    fi

    echo && echo "Detected your preferred shell is ${CURRENT_SHELL} and added foundryup to PATH. Run 'source ${PROFILE}' or start a new terminal session to use mdev." && echo
    exit 0
else
    echo "mdev directory does not exist"
fi
