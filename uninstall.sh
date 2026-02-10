#!/bin/bash
#############################################
# NexPanel - Uninstaller
# For Ubuntu 20.04 / 22.04 LTS
# Removes NexPanel and associated configurations
#############################################
set -e
# Colors and formatting - Enhanced palette
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'
MAGENTA=$'\033[0;35m'
CYAN=$'\033[0;36m'
WHITE=$'\033[1;37m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
NC=$'\033[0m'
# Enhanced colors for modern UI
PURPLE=$'\033[0;35m'
BRIGHT_BLUE=$'\033[1;34m'
BRIGHT_GREEN=$'\033[1;32m'
BRIGHT_CYAN=$'\033[1;36m'
BRIGHT_YELLOW=$'\033[1;33m'
GRAY=$'\033[0;90m'
# Log file setup
LOG_FILE="/var/log/nexpanel-uninstall.log"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1
# Progress tracking
TOTAL_STEPS=7
CURRENT_STEP=0
#############################################
# Helper Functions
#############################################
print_banner() {
    clear
    echo -e "${BRIGHT_CYAN}${BOLD}"
    cat <<EOF
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   ███╗   ██╗███████╗██╗  ██╗██████╗  █████╗ ███╗   ██╗███████╗██╗       ║
║   ████╗  ██║██╔════╝╚██╗██╔╝██╔══██╗██╔══██╗████╗  ██║██╔════╝██║       ║
║   ██╔██╗ ██║█████╗   ╚███╔╝ ██████╔╝███████║██╔██╗ ██║█████╗  ██║       ║
║   ██║╚██╗██║██╔══╝   ██╔██╗ ██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║       ║
║   ██║ ╚████║███████╗██╔╝ ██╗██║     ██║  ██║██║ ╚████║███████╗███████╗  ║
║   ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝  ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║                  🗑️  NexPanel Uninstaller Tool  🗑️                        ║
║                                                                           ║
║              ${WHITE}Completely remove NexPanel and its data${BRIGHT_CYAN}                     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo ""
}
print_step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    local step_name="$1"
    local percentage=$((CURRENT_STEP * 100 / TOTAL_STEPS))
    
    printf "\n\n"
    
    local bar_width=50
    local filled=$((percentage * bar_width / 100))
    local empty=$((bar_width - filled))
    local bar=""
    
    for ((i=0; i<filled; i++)); do bar+="▰"; done
    for ((i=0; i<empty; i++)); do bar+="▱"; done
    
    echo -e "${BRIGHT_CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BRIGHT_CYAN}║${NC} ${BRIGHT_YELLOW}Step ${CURRENT_STEP}/${TOTAL_STEPS}${NC} ${GRAY}│${NC} ${step_name}"
    echo -e "${BRIGHT_CYAN}╠════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BRIGHT_CYAN}║${NC} ${BRIGHT_GREEN}${bar}${NC} ${BRIGHT_YELLOW}${percentage}%${NC}"
    echo -e "${BRIGHT_CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}
print_success() {
    echo -e "  ${BRIGHT_GREEN}✓${NC} ${WHITE}$1${NC}"
}
print_error() {
    echo -e "  ${RED}✗${NC} ${WHITE}$1${NC}"
}
print_warning() {
    echo -e "  ${BRIGHT_YELLOW}⚠${NC} ${WHITE}$1${NC}"
}
print_info() {
    echo -e "  ${BRIGHT_BLUE}ℹ${NC} ${DIM}$1${NC}"
}
run_with_spinner() {
    local command="$1"
    local message="$2"
    local temp_log=$(mktemp)
    
    eval "$command" > "$temp_log" 2>&1 &
    local pid=$!
    local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0
    
    tput civis 2>/dev/null || true
    
    while kill -0 $pid 2>/dev/null; do
        i=$(( (i+1) % 10 ))
        printf "\r  ${CYAN}${spin:$i:1}${NC} ${WHITE}${message}...${NC}"
        sleep 0.1
    done
    
    wait $pid
    local exit_code=$?
    
    tput cnorm 2>/dev/null || true
    printf "\r\033[K"
    
    if [ $exit_code -eq 0 ]; then
        print_success "$message"
        cat "$temp_log" >> "$LOG_FILE"
        rm -f "$temp_log"
        return 0
    else
        print_error "$message failed"
        cat "$temp_log" >> "$LOG_FILE"
        rm -f "$temp_log"
        return $exit_code
    fi
}
#############################################
# Main Uninstallation Flow
#############################################
print_banner
# Check root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root"
    exit 1
fi
echo -e "${RED}${BOLD}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}${BOLD}║${NC}  ${WHITE}${BOLD}⚠️  DESTRUCTIVE ACTION CONFIRMATION${NC}                               ${RED}${BOLD}║${NC}"
echo -e "${RED}${BOLD}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${WHITE}You are about to uninstall NexPanel from your server.${NC}"
echo -e "  ${WHITE}This will remove:${NC}"
echo -e "    • The NexPanel application and service"
echo -e "    • Admin credentials and configuration files"
echo -e "    • Web server configurations for the panel"
echo ""
echo -e "  ${YELLOW}Existing websites and databases will NOT be deleted unless specified.${NC}"
echo ""
read -p "$(echo -e "${RED}${BOLD}Are you sure you want to proceed? Type 'uninstall' to confirm:${NC} ")" confirm
if [ "$confirm" != "uninstall" ]; then
    echo ""
    print_warning "Uninstallation cancelled."
    exit 0
fi
# Step 1: Stop Services
print_step "🛑 Stopping Services"
if systemctl is-active --quiet nexpanel; then
    run_with_spinner "systemctl stop nexpanel" "Stopping NexPanel service"
    run_with_spinner "systemctl disable nexpanel" "Disabling NexPanel service"
else
    print_info "NexPanel service is not running"
fi
# Step 2: Remove Panel Files
print_step "🗑️ Removing Panel Files"
if [ -d "/opt/nexpanel" ]; then
    run_with_spinner "rm -rf /opt/nexpanel" "Removing panel directory (/opt/nexpanel)"
else
    print_warning "Panel directory not found"
fi
if [ -f "/etc/systemd/system/nexpanel.service" ]; then
    run_with_spinner "rm -f /etc/systemd/system/nexpanel.service" "Removing systemd service file"
fi
if [ -f "/root/nexpanel-credentials.txt" ]; then
    run_with_spinner "rm -f /root/nexpanel-credentials.txt" "Removing credentials file"
fi
# Step 3: Remove System Configurations
print_step "⚙️ Cleaning System Configurations"
# Remove Nginx config
if [ -f "/etc/nginx/sites-enabled/nexpanel" ]; then
    rm -f /etc/nginx/sites-enabled/nexpanel
    rm -f /etc/nginx/sites-available/nexpanel
    print_success "Removed Nginx proxy configuration"
fi
if [ -f "/etc/nginx/conf.d/tuning.conf" ]; then
    rm -f /etc/nginx/conf.d/tuning.conf
    print_success "Removed Nginx tuning configuration"
fi
# Remove MariaDB config
if [ -f "/etc/mysql/mariadb.conf.d/99-nexpanel.cnf" ]; then
    rm -f /etc/mysql/mariadb.conf.d/99-nexpanel.cnf
    print_success "Removed MariaDB tuning configuration"
fi
# Remove Fail2Ban config
if [ -f "/etc/fail2ban/jail.d/nexpanel.conf" ]; then
    rm -f /etc/fail2ban/jail.d/nexpanel.conf
    rm -f /etc/fail2ban/filter.d/nexpanel.conf
    print_success "Removed Fail2Ban configuration"
fi
# Remove MOTD
if [ -f "/etc/update-motd.d/99-nexpanel" ]; then
    rm -f /etc/update-motd.d/99-nexpanel
    print_success "Removed SSH banner"
fi
run_with_spinner "systemctl daemon-reload" "Reloading systemd daemon"
# Step 4: Reload Services
print_step "🔄 Reloading Services"
run_with_spinner "systemctl restart nginx" "Restarting Nginx"
run_with_spinner "systemctl restart mariadb" "Restarting MariaDB"
run_with_spinner "systemctl restart fail2ban" "Restarting Fail2Ban"
# Step 5: Full System Cleanup (Packages)
print_step "🧹 Full System Cleanup"
echo -e "${RED}${BOLD}Do you want to remove installed packages?${NC}"
echo -e "${DIM}(Nginx, MariaDB, PHP, Node.js, Certbot)${NC}"
read -p "$(echo -e "${WHITE}Remove packages? [y/N]: ${NC}")" -n 1 -r remove_pkgs
echo ""
echo ""

PACKAGES_REMOVED=false

if [[ $remove_pkgs =~ ^[Yy]$ ]]; then
    # Stop services first
    run_with_spinner "systemctl stop nginx mariadb php*-fpm redis-server vsftpd" "Stopping system services"
    
    # Remove packages (Aggressive MariaDB cleanup)
    print_info "Removing packages..."
    
    # Identify all MariaDB/MySQL related packages
    MARIA_PKGS=$(dpkg -l | grep -E "mariadb|mysql" | awk '{print $2}')
    
    if [ -n "$MARIA_PKGS" ]; then
        print_info "Found database packages: $MARIA_PKGS"
        DEBIAN_FRONTEND=noninteractive apt-get purge -y $MARIA_PKGS > /dev/null 2>&1
    fi
    
    DEBIAN_FRONTEND=noninteractive apt-get purge -y nginx nginx-common nginx-full php* nodejs certbot python3-certbot-nginx redis-server vsftpd > /dev/null 2>&1
    print_success "Packages removed"
    
    # Remove system user and group for mysql if they exist
    if id -u mysql >/dev/null 2>&1; then
        deluser mysql >/dev/null 2>&1 || true
        delgroup mysql >/dev/null 2>&1 || true
        print_info "Removed mysql system user"
    fi
    
    # Remove PM2 and global npm packages
    if command -v npm &> /dev/null; then
        run_with_spinner "npm uninstall -g pm2" "Removing PM2"
        rm -rf /root/.pm2 /root/.npm /root/.config/configstore
    fi

    # Remove Repositories
    print_info "Removing repositories..."
    add-apt-repository --remove -y ppa:ondrej/php >/dev/null 2>&1 || true
    rm -f /etc/apt/sources.list.d/nodesource.list
    rm -f /etc/apt/keyrings/nodesource.gpg
    
    # Cleanup dependencies
    run_with_spinner "apt-get autoremove -y --purge" "Cleaning up unused dependencies"
    
    # Remove configs
    rm -rf /etc/nginx /etc/mysql /etc/php /etc/redis /etc/vsftpd.conf
    rm -rf /var/log/nginx /var/log/mysql /var/log/redis
    rm -rf /tmp/cloudflared
    
    print_success "Removed service configurations and repositories"
    
    PACKAGES_REMOVED=true
else
    print_info "Skipping package removal"
fi

# Step 6: Database & Data Cleanup
print_step "🗑️ Data Removal"

if [ "$PACKAGES_REMOVED" = true ]; then
    # Scenario A: Packages are gone. We can just delete files. No password needed.
    if [ -d "/var/lib/mysql" ]; then
        echo -e "${YELLOW}Remove MariaDB data directory?${NC}"
        echo -e "${DIM}(WARNING: This deletes ALL databases)${NC}"
        read -p "$(echo -e "${WHITE}Remove /var/lib/mysql? [y/N]: ${NC}")" -n 1 -r remove_db_data
        echo ""
        if [[ $remove_db_data =~ ^[Yy]$ ]]; then
            run_with_spinner "rm -rf /var/lib/mysql" "Removing MariaDB data directory"
        fi
    fi
else
    # Scenario B: Packages exist. We must be polite and use SQL.
    echo -e "${YELLOW}Would you like to remove the 'nexpanel' database?${NC}"
    echo -e "${DIM}(Contains panel settings, user accounts, and metadata)${NC}"
    read -p "$(echo -e "${WHITE}Remove panel database? [y/N]: ${NC}")" -n 1 -r remove_db
    echo ""
    
    if [[ $remove_db =~ ^[Yy]$ ]]; then
        # Try to auto-detect password first
        if [ -f "/root/nexpanel-credentials.txt" ]; then
            DB_PASS=$(grep "MariaDB Root Password:" /root/nexpanel-credentials.txt | cut -d: -f2 | xargs)
        fi

        if [ -n "$DB_PASS" ] && mysql -u root -p"$DB_PASS" -e "STATUS" >/dev/null 2>&1; then
             print_info "Using credentials from file..."
        else
             echo -e "${WHITE}Please enter MariaDB root password:${NC}"
             read -s DB_PASS
             echo ""
        fi

        if mysql -u root -p"$DB_PASS" -e "DROP DATABASE IF EXISTS nexpanel;" 2>/dev/null; then
            print_success "Dropped 'nexpanel' database"
            mysql -u root -p"$DB_PASS" -e "DROP USER IF EXISTS 'panel_admin'@'localhost';" 2>/dev/null
            print_success "Removed 'panel_admin' database user"
            mysql -u root -p"$DB_PASS" -e "FLUSH PRIVILEGES;" 2>/dev/null
        else
            print_error "Failed to drop database (Incorrect password?)"
        fi
    else
        print_info "Skipping database removal"
    fi
fi

# Remove Panel Data
echo -e "${YELLOW}Would you like to remove the NexPanel data directory?${NC}"
echo -e "${DIM}(Contains website backups, logs, and uploads)${NC}"
read -p "$(echo -e "${WHITE}Remove /opt/nexpanel/data? [y/N]: ${NC}")" -n 1 -r remove_data
echo ""
if [[ $remove_data =~ ^[Yy]$ ]]; then
    if [ -d "/opt/nexpanel/data" ]; then
         run_with_spinner "rm -rf /opt/nexpanel/data" "Removing data directory"
    fi
else
    print_info "Skipping data removal"
fi

echo -e "${RED}${BOLD}Do you want to remove ALL website data?${NC}"
echo -e "${DIM}(/var/www - WARNING: This destroys all hosted sites)${NC}"
read -p "$(echo -e "${WHITE}Remove /var/www? [y/N]: ${NC}")" -n 1 -r remove_www
echo ""
if [[ $remove_www =~ ^[Yy]$ ]]; then
    run_with_spinner "rm -rf /var/www" "Removing /var/www"
fi
# Step 7: Completion
print_step "✨ Uninstallation Complete"
echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║${NC}  ${WHITE}${BOLD}✅ NexPanel has been uninstalled${NC}                                    ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${DIM}Log file: $LOG_FILE${NC}"
echo ""
