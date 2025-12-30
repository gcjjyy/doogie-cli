#!/bin/sh
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

REPO="gcjjyy/doogie-cli"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

print_status() { printf "${BLUE}[*]${NC} %s\n" "$1"; }
print_success() { printf "${GREEN}[+]${NC} %s\n" "$1"; }
print_warning() { printf "${YELLOW}[!]${NC} %s\n" "$1"; }
print_error() { printf "${RED}[-]${NC} %s\n" "$1"; }

# Check if running as root
check_root() {
    if [ "$(id -u)" -eq 0 ]; then
        SUDO=""
    else
        if command -v sudo >/dev/null 2>&1; then
            SUDO="sudo"
        else
            print_error "This script requires root privileges. Please run as root or install sudo."
            exit 1
        fi
    fi
}

# Detect package manager
detect_package_manager() {
    if command -v apt-get >/dev/null 2>&1; then
        PKG_MANAGER="apt"
        PKG_UPDATE="$SUDO apt-get update"
        PKG_INSTALL="$SUDO apt-get install -y"
        P7ZIP_PKG="p7zip-full"
    elif command -v dnf >/dev/null 2>&1; then
        PKG_MANAGER="dnf"
        PKG_UPDATE="$SUDO dnf check-update || true"
        PKG_INSTALL="$SUDO dnf install -y"
        P7ZIP_PKG="p7zip p7zip-plugins"
    elif command -v yum >/dev/null 2>&1; then
        PKG_MANAGER="yum"
        PKG_UPDATE="$SUDO yum check-update || true"
        PKG_INSTALL="$SUDO yum install -y"
        P7ZIP_PKG="p7zip p7zip-plugins"
    elif command -v pacman >/dev/null 2>&1; then
        PKG_MANAGER="pacman"
        PKG_UPDATE="$SUDO pacman -Sy"
        PKG_INSTALL="$SUDO pacman -S --noconfirm"
        P7ZIP_PKG="p7zip"
    elif command -v zypper >/dev/null 2>&1; then
        PKG_MANAGER="zypper"
        PKG_UPDATE="$SUDO zypper refresh"
        PKG_INSTALL="$SUDO zypper install -y"
        P7ZIP_PKG="p7zip-full"
    else
        print_error "Unsupported package manager. Please install dependencies manually."
        exit 1
    fi
    print_status "Detected package manager: $PKG_MANAGER"
}

# Detect architecture
detect_arch() {
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64|amd64)
            PLATFORM="linux-x64"
            ;;
        aarch64|arm64)
            PLATFORM="linux-arm64"
            print_warning "ARM64 support is experimental"
            ;;
        *)
            print_error "Unsupported architecture: $ARCH"
            exit 1
            ;;
    esac
    print_status "Detected architecture: $ARCH ($PLATFORM)"
}

# Install 7-Zip
install_7zip() {
    if command -v 7z >/dev/null 2>&1; then
        print_success "7-Zip is already installed"
        return
    fi

    print_status "Installing 7-Zip..."
    $PKG_INSTALL $P7ZIP_PKG
    print_success "7-Zip installed"
}

# Install DOSBox-X
install_dosbox_x() {
    if command -v dosbox-x >/dev/null 2>&1; then
        print_success "DOSBox-X is already installed"
        return
    fi

    print_status "Installing DOSBox-X..."

    case "$PKG_MANAGER" in
        apt)
            # Try official repo first, then Flatpak
            if $PKG_INSTALL dosbox-x 2>/dev/null; then
                print_success "DOSBox-X installed via apt"
            else
                print_warning "DOSBox-X not in apt repos, trying Flatpak..."
                install_dosbox_x_flatpak
            fi
            ;;
        dnf|yum)
            if $PKG_INSTALL dosbox-x 2>/dev/null; then
                print_success "DOSBox-X installed via $PKG_MANAGER"
            else
                print_warning "DOSBox-X not in repos, trying Flatpak..."
                install_dosbox_x_flatpak
            fi
            ;;
        pacman)
            # Arch has dosbox-x in AUR, use Flatpak for simplicity
            if $PKG_INSTALL dosbox-x 2>/dev/null; then
                print_success "DOSBox-X installed via pacman"
            else
                print_warning "DOSBox-X not in repos, trying Flatpak..."
                install_dosbox_x_flatpak
            fi
            ;;
        zypper)
            if $PKG_INSTALL dosbox-x 2>/dev/null; then
                print_success "DOSBox-X installed via zypper"
            else
                print_warning "DOSBox-X not in repos, trying Flatpak..."
                install_dosbox_x_flatpak
            fi
            ;;
        *)
            install_dosbox_x_flatpak
            ;;
    esac
}

# Install DOSBox-X via Flatpak (fallback)
install_dosbox_x_flatpak() {
    # Install Flatpak if not present
    if ! command -v flatpak >/dev/null 2>&1; then
        print_status "Installing Flatpak..."
        case "$PKG_MANAGER" in
            apt) $PKG_INSTALL flatpak ;;
            dnf|yum) $PKG_INSTALL flatpak ;;
            pacman) $PKG_INSTALL flatpak ;;
            zypper) $PKG_INSTALL flatpak ;;
        esac
    fi

    # Add Flathub repo
    $SUDO flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo 2>/dev/null || true

    # Install DOSBox-X
    $SUDO flatpak install -y flathub com.dosbox_x.DOSBox-X

    # Create wrapper script
    print_status "Creating dosbox-x wrapper..."
    $SUDO tee "$INSTALL_DIR/dosbox-x" > /dev/null << 'WRAPPER'
#!/bin/sh
exec flatpak run com.dosbox_x.DOSBox-X "$@"
WRAPPER
    $SUDO chmod +x "$INSTALL_DIR/dosbox-x"

    print_success "DOSBox-X installed via Flatpak"
}

# Install doogie-cli
install_doogie() {
    print_status "Fetching latest doogie-cli version..."

    # Get latest version
    VERSION=$(curl -sL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | head -1 | cut -d'"' -f4)

    if [ -z "$VERSION" ]; then
        print_error "Failed to fetch latest version"
        exit 1
    fi

    print_status "Installing doogie-cli $VERSION..."

    # Create temp directory
    TMPDIR=$(mktemp -d)
    trap "rm -rf $TMPDIR" EXIT

    # Download and extract
    DOWNLOAD_URL="https://github.com/$REPO/releases/download/$VERSION/doogie-cli-$PLATFORM.tar.gz"
    print_status "Downloading from $DOWNLOAD_URL"

    if ! curl -fsSL "$DOWNLOAD_URL" | tar -xz -C "$TMPDIR"; then
        print_error "Failed to download doogie-cli"
        exit 1
    fi

    # Install binary
    $SUDO mkdir -p "$INSTALL_DIR"
    $SUDO mv "$TMPDIR/doogie-cli-$PLATFORM" "$INSTALL_DIR/doogie"
    $SUDO chmod +x "$INSTALL_DIR/doogie"

    print_success "doogie-cli $VERSION installed to $INSTALL_DIR/doogie"
}

# Verify installation
verify_installation() {
    echo ""
    print_status "Verifying installation..."

    if command -v doogie >/dev/null 2>&1; then
        print_success "doogie: $(which doogie)"
    else
        print_warning "doogie not in PATH. Add $INSTALL_DIR to your PATH."
    fi

    if command -v dosbox-x >/dev/null 2>&1; then
        print_success "dosbox-x: $(which dosbox-x)"
    elif flatpak list 2>/dev/null | grep -q DOSBox-X; then
        print_success "dosbox-x: installed via Flatpak"
    else
        print_warning "dosbox-x: not found"
    fi

    if command -v 7z >/dev/null 2>&1; then
        print_success "7z: $(which 7z)"
    else
        print_warning "7z: not found"
    fi
}

# Print banner
print_banner() {
    echo ""
    printf "${GREEN}"
    echo "  ____                    _        ____ _     ___ "
    echo " |  _ \\  ___   ___   __ _(_) ___  / ___| |   |_ _|"
    echo " | | | |/ _ \\ / _ \\ / _\` | |/ _ \\| |   | |    | | "
    echo " | |_| | (_) | (_) | (_| | |  __/| |___| |___ | | "
    echo " |____/ \\___/ \\___/ \\__, |_|\\___| \\____|_____|___|"
    echo "                    |___/                         "
    printf "${NC}"
    echo ""
    echo " 두기의 고전게임 런처 CLI 설치 스크립트"
    echo " https://github.com/gcjjyy/doogie-cli"
    echo ""
}

# Main
main() {
    print_banner

    check_root
    detect_package_manager
    detect_arch

    echo ""
    print_status "Updating package lists..."
    $PKG_UPDATE

    echo ""
    install_7zip
    install_dosbox_x
    install_doogie

    verify_installation

    echo ""
    print_success "Installation complete!"
    echo ""
    echo "Run 'doogie' to start the launcher."
    echo ""
}

main "$@"
