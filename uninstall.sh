#!/bin/bash

# NexPanel Uninstaller Script
# Removes all NexPanel components and leaves no trace

# Text colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Box drawing characters
BOX_TOP="╔"
BOX_HORIZ="═"
BOX_SIDE="║"
BOX_BOTTOM="╚"
BOX_DIV="╠"
BOX_END="╣"
BOX_CORNER="╦"
BOX_BOTTOM_CORNER="╩"

# Progress bar characters
PROGRESS_FULL="▰"
PROGRESS_EMPTY="▱"

# Print colored header
print_header() {
    clear
    echo -e "${CYAN}${BOX_TOP}$(printf '%.0s' {1..68})${BOX_CORNER}"
    echo -e "${BOX_SIDE}   ${WHITE}${BOLD}🚀  NEXPANEL${NC}                                        ${BOX_SIDE}"
    echo -e "${BOX_SIDE}   ${WHITE}${BOLD}🗑️  Next-Generation Hosting Panel Uninstaller${NC}         ${BOX_SIDE}"
    echo -e "${BOX_SIDE}   ${WHITE}${BOLD}🚀  Next-Generation Hosting Management Panel  🚀${NC}       ${BOX_SIDE}"
    echo -e "${CYAN}$(printf '%.0s' {1..2})${BOX_DIV}$(printf '%.0s' {1..66})${BOX_END}"
    echo -e "${BOX_SIDE}   ${CYAN}⚠️  WARNING: This will remove ALL NexPanel data${NC}            ${BOX_SIDE}"
    echo -e "${BOX_SIDE}   ${CYAN}   including websites, databases, and configurations${NC}        ${BOX_SIDE}"
    echo -e "${CYAN}${BOX_BOTTOM}$(printf '%.0s' {1..68})${BOX_BOTTOM_CORNER}"
    echo ""
}

# Print step header
print_step() {
    local step=$1
    local total=$2
    local title=$3
    local color=$4
    
    echo -e "${color}${BOX_TOP}$(printf '%.0s' {1..2})${BOX_DIV}$(printf '%.0s' {1..66})${BOX_END}"
    echo -e "${BOX_SIDE}   ${color}Step ${step}/${total} │ ${title}$(printf ' %.0s' {1..$((50 - ${#title}))})${BOX_SIDE}"
    echo -e "${color}${BOX_BOTTOM}$(printf '%.0s' {1..2})${BOX_DIV}$(printf '%.0s' {1..66})${BOX_END}"
    echo ""
}

# Print status with icon
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "ok")
            echo -e "  ${GREEN}✓${NC}  ${message}"
            ;;
        "error")
            echo -e "  ${RED}✗${NC}  ${message}"
            ;;
        "warn")
            echo -e "  ${YELLOW}⚠${NC}  ${message}"
            ;;
        "info")
            echo -e "  ${BLUE}ℹ${NC}  ${message}"
            ;;
        "skip")
            echo -e "  ${YELLOW}⊘${NC}  ${message}"
            ;;
    esac
}

# Print progress bar
print_progress() {
    local current=$1
    local total=$2
    
    local width=40
    local percent=$((current * 100 / total))
    local filled=$((width * current / total))
    local empty=$((width - filled))
    
    printf "\r  ${CYAN}[${PROGRESS_FULL}%s${PROGRESS_EMPTY}%s]${NC} ${percent}%%" \
        "$(printf '%.0s' {1..$filled})" "$(printf '%.0s' {1..$empty})"
}

# Print section box
print_section() {
    local title=$1
    local color=$2
    
    echo ""
    echo -e "${color}${BOX_TOP}$(printf '%.0s' {1..2})${BOX_DIV}$(printf '%.0s' {1..66})${BOX_END}"
    echo -e "${BOX_SIDE}   ${WHITE}${BOLD}${title}${NC}$(printf ' %.0s' {1..$((68 - ${#title} - 4))})${BOX_SIDE}"
    echo -e "${color}${BOX_BOTTOM}$(printf '%.0s' {1..2})${BOX_DIV}$(printf '%.0s' {1..66})${BOX_END}"
    echo ""
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_header
        echo -e "  ${RED}✗  Error: This script must be run as root${NC}"
        echo ""
        echo -e "  ${YELLOW}Please run: ${WHITE}sudo $0${NC}"
        echo ""
        exit 1
    fi
}

# Check if NexPanel is installed
check_installation() {
    local installed=false
    
    if [[ -f /etc/systemd/system/nexpanel.service ]]; then
        installed=true
    elif [[ -d /opt/nexpanel ]]; then
        installed=true
    elif [[ -d /var/www/nexpanel_* ]]; then
        installed=true
    elif command -v nexpanel &> /dev/null; then
        installed=true
    fi
    
    if [[ $installed == false ]]; then
        print_header
        print_section "📊  Installation Check" $BLUE
        
        echo -e "  ${YELLOW}⊘  NexPanel does not appear to be installed on this system${NC}"
        echo ""
        echo "  Nothing to remove."
        echo ""
        exit 0
    fi
}

# Confirmation prompt
confirm_uninstall() {
    print_header
    print_section "⚠️  Confirmation Required" $YELLOW
    
    echo -e "  ${RED}${BOLD}WARNING: This will completely remove NexPanel:${NC}"
    echo ""
    
    echo -e "  ${WHITE}Services & Processes:${NC}"
    echo -e "    ${RED}•${NC}  Stop and remove NexPanel systemd service"
    echo -e "    ${RED}•${NC}  Remove all PM2 processes for NexPanel apps"
    echo -e "    ${RED}•${NC}  Stop Nginx configurations"
    echo ""
    
    echo -e "  ${WHITE}Data & Files:${NC}"
    echo -e "    ${RED}•${NC}  Delete all website directories (/var/www/nexpanel_*)"
    echo -e "    ${RED}•${NC}  Remove all backups (/var/backups/nexpanel_*)"
    echo -e "    ${RED}•${NC}  Delete database files and data directories"
    echo -e "    ${RED}•${NC}  Remove log files"
    echo ""
    
    echo -e "  ${WHITE}Configurations:${NC}"
    echo -e "    ${RED}•${NC}  Remove Nginx server configurations"
    echo -e "    ${RED}•${NC}  Remove PHP-FPM pools"
    echo -e "    ${RED}•${NC}  Delete cron jobs"
    echo -e "    ${RED}•${NC}  Remove user accounts"
    echo ""
    
    echo -e "  ${YELLOW}Note: Node.js, MariaDB, and other dependencies${NC}"
    echo -e "  ${YELLOW}     will NOT be removed (must be done manually)${NC}"
    echo ""
    
    read -p "  Are you sure you want to continue? [y/N]: " -n 1 -r
    echo ""
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "  ${GREEN}✓  Uninstallation cancelled${NC}"
        echo ""
        exit 0
    fi
}

# Step 1: Stop services
step1_stop_services() {
    print_step "1" "9" "🛑 Stopping Services" $YELLOW
    
    local stopped=false
    
    # Stop NexPanel service
    if systemctl is-active --quiet nexpanel 2>/dev/null; then
        systemctl stop nexpanel
        systemctl disable nexpanel
        print_status "ok" "Stopped NexPanel service"
        stopped=true
    else
        print_status "skip" "NexPanel service not running"
    fi
    
    # Remove systemd service file
    if [[ -f /etc/systemd/system/nexpanel.service ]]; then
        rm -f /etc/systemd/system/nexpanel.service
        systemctl daemon-reload
        print_status "ok" "Removed NexPanel systemd service"
        stopped=true
    fi
    
    # Stop PM2 processes
    if command -v pm2 &> /dev/null; then
        local pm2_count=$(pm2 list 2>/dev/null | grep -c "nexpanel" || echo "0")
        if [[ $pm2_count -gt 0 ]]; then
            pm2 delete all 2>/dev/null || true
            pm2 save 2>/dev/null || true
            print_status "ok" "Stopped PM2 processes"
            stopped=true
        else
            print_status "skip" "No PM2 processes found"
        fi
    fi
    
    # Reload systemd
    if [[ $stopped == true ]]; then
        systemctl daemon-reload 2>/dev/null || true
    fi
    
    echo ""
    print_progress 1 9
    echo ""
}

# Step 2: Remove Nginx configurations
step2_remove_nginx() {
    print_step "2" "9" "🌐 Removing Nginx Configurations" $BLUE
    
    # Remove main NexPanel config
    if [[ -f /etc/nginx/sites-available/nexpanel ]]; then
        rm -f /etc/nginx/sites-available/nexpanel
        print_status "ok" "Removed NexPanel Nginx config"
    else
        print_status "skip" "NexPanel Nginx config not found"
    fi
    
    # Remove enabled config
    if [[ -f /etc/nginx/sites-enabled/nexpanel ]]; then
        rm -f /etc/nginx/sites-enabled/nexpanel
        print_status "ok" "Disabled NexPanel site"
    else
        print_status "skip" "NexPanel site not enabled"
    fi
    
    # Remove snippets
    rm -f /etc/nginx/snippets/nexpanel-*.conf 2>/dev/null || true
    
    # Find and remove all NexPanel site configs
    local site_count=$(find /etc/nginx/sites-available/ -name "nexpanel_*" 2>/dev/null | wc -l)
    if [[ $site_count -gt 0 ]]; then
        find /etc/nginx/sites-available/ -name "nexpanel_*" -delete 2>/dev/null
        find /etc/nginx/sites-enabled/ -name "nexpanel_*" -delete 2>/dev/null
        print_status "ok" "Removed ${site_count} website configs"
    else
        print_status "skip" "No website configs found"
    fi
    
    # Test and reload Nginx
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        print_status "ok" "Reloaded Nginx"
    else
        print_status "warn" "Nginx configuration error (ignoring)"
    fi
    
    echo ""
    print_progress 2 9
    echo ""
}

# Step 3: Remove PHP-FPM pools
step3_remove_php() {
    print_step "3" "9" "🐘 Removing PHP-FPM Pools" $CYAN
    
    local removed=false
    
    for version in 7.4 8.0 8.1 8.2; do
        local pool_count=$(find /etc/php/${version}/fpm/pool.d/ -name "*nexpanel*" 2>/dev/null | wc -l)
        if [[ $pool_count -gt 0 ]]; then
            rm -f /etc/php/${version}/fpm/pool.d/*nexpanel*.conf
            print_status "ok" "Removed ${pool_count} PHP ${version} pools"
            removed=true
        else
            print_status "skip" "No PHP ${version} pools found"
        fi
    done
    
    # Reload PHP-FPM
    if [[ $removed == true ]]; then
        for version in 7.4 8.0 8.1 8.2; do
            systemctl reload php${version}-fpm 2>/dev/null || true
        done
    fi
    
    echo ""
    print_progress 3 9
    echo ""
}

# Step 4: Remove websites
step4_remove_websites() {
    print_step "4" "9" "🌍 Removing Website Directories" $GREEN
    
    # Count and remove NexPanel websites
    local website_count=$(find /var/www -maxdepth 1 -name "nexpanel_*" -type d 2>/dev/null | wc -l)
    if [[ $website_count -gt 0 ]]; then
        find /var/www -maxdepth 1 -name "nexpanel_*" -type d -exec rm -rf {} \; 2>/dev/null
        print_status "ok" "Removed ${website_count} website directories"
    else
        print_status "skip" "No website directories found"
    fi
    
    # Remove main NexPanel directory
    if [[ -d /var/www/nexpanel ]]; then
        rm -rf /var/www/nexpanel
        print_status "ok" "Removed main NexPanel directory"
    else
        print_status "skip" "Main NexPanel directory not found"
    fi
    
    echo ""
    print_progress 4 9
    echo ""
}

# Step 5: Remove backups
step5_remove_backups() {
    print_step "5" "9" "💾 Removing Backup Directories" $YELLOW
    
    # Remove NexPanel backup directory
    if [[ -d /var/backups/nexpanel ]]; then
        rm -rf /var/backups/nexpanel
        print_status "ok" "Removed backup directory"
    else
        print_status "skip" "Backup directory not found"
    fi
    
    # Remove any website-specific backups
    local backup_count=$(find /var/backups -maxdepth 1 -name "nexpanel_*" -type d 2>/dev/null | wc -l)
    if [[ $backup_count -gt 0 ]]; then
        find /var/backups -maxdepth 1 -name "nexpanel_*" -type d -exec rm -rf {} \; 2>/dev/null
        print_status "ok" "Removed ${backup_count} backup directories"
    else
        print_status "skip" "No backup directories found"
    fi
    
    echo ""
    print_progress 5 9
    echo ""
}

# Step 6: Remove data and databases
step6_remove_data() {
    print_step "6" "9" "🗄️  Removing Data & Databases" $BLUE
    
    # Remove database files
    if [[ -f /var/lib/nexpanel.db ]]; then
        rm -f /var/lib/nexpanel.db
        print_status "ok" "Removed database file"
    else
        print_status "skip" "Database file not found"
    fi
    
    # Remove data directories
    local data_dirs=("/opt/nexpanel/data" "/home/nexpanel" "/root/nexpanel")
    for dir in "${data_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            rm -rf "$dir"
            print_status "ok" "Removed ${dir}"
        else
            print_status "skip" "${dir} not found"
        fi
    done
    
    # Remove log files
    local log_count=$(find /var/log -maxdepth 1 -name "nexpanel*" 2>/dev/null | wc -l)
    if [[ $log_count -gt 0 ]]; then
        find /var/log -maxdepth 1 -name "nexpanel*" -delete 2>/dev/null
        print_status "ok" "Removed ${log_count} log files"
    else
        print_status "skip" "No log files found"
    fi
    
    echo ""
    print_progress 6 9
    echo ""
}

# Step 7: Remove user accounts
step7_remove_users() {
    print_step "7" "9" "👤 Removing User Accounts" $CYAN
    
    # Remove NexPanel user
    if id "nexpanel" &>/dev/null; then
        userdel -r nexpanel 2>/dev/null || userdel nexpanel 2>/dev/null
        if id "nexpanel" &>/dev/null; then
            userdel nexpanel 2>/dev/null
        fi
        print_status "ok" "Removed 'nexpanel' user"
    else
        print_status "skip" "'nexpanel' user not found"
    fi
    
    # Remove FTP users
    if command -v vsftpd &> /dev/null; then
        if id "ftp_nexpanel" &>/dev/null; then
            userdel ftp_nexpanel 2>/dev/null
            print_status "ok" "Removed FTP user"
        else
            print_status "skip" "FTP user not found"
        fi
    fi
    
    echo ""
    print_progress 7 9
    echo ""
}

# Step 8: Remove cron jobs and configs
step8_remove_cron() {
    print_step "8" "9" "⏰ Removing Cron Jobs & Configs" $GREEN
    
    # Remove cron.d file
    if [[ -f /etc/cron.d/nexpanel ]]; then
        rm -f /etc/cron.d/nexpanel
        print_status "ok" "Removed cron job"
    else
        print_status "skip" "Cron job not found"
    fi
    
    # Remove profile scripts
    if [[ -f /etc/profile.d/nexpanel.sh ]]; then
        rm -f /etc/profile.d/nexpanel.sh
        print_status "ok" "Removed profile script"
    else
        print_status "skip" "Profile script not found"
    fi
    
    echo ""
    print_progress 8 9
    echo ""
}

# Step 9: Final cleanup
step9_final_cleanup() {
    print_step "9" "9" "✨ Final Cleanup" $CYAN
    
    # Remove temp files
    rm -f /tmp/nexpanel* 2>/dev/null || true
    rm -f /tmp/.nexpanel* 2>/dev/null || true
    
    # Clear PM2 logs
    if command -v pm2 &> /dev/null; then
        pm2 flush 2>/dev/null || true
    fi
    
    print_status "ok" "Cleared temporary files"
    print_status "ok" "Cleared PM2 logs"
    
    echo ""
    print_progress 9 9
    echo ""
}

# Print completion message
print_completion() {
    clear
    echo -e "${GREEN}${BOX_TOP}$(printf '%.0s' {1..68})${BOX_CORNER}"
    echo -e "${BOX_SIDE}   ${WHITE}${BOLD}✅  UNINSTALLATION COMPLETE${NC}                                  ${BOX_SIDE}"
    echo -e "${BOX_SIDE}   ${WHITE}${BOLD}🚀  Next-Generation Hosting Management Panel  🚀${NC}             ${BOX_SIDE}"
    echo -e "${GREEN}$(printf '%.0s' {1..2})${BOX_DIV}$(printf '%.0s' {1..66})${BOX_END}"
    echo ""
    echo -e "  ${GREEN}✓${NC}  NexPanel has been completely removed from your system"
    echo ""
    echo -e "  ${WHITE}Removed Components:${NC}"
    echo -e "    ${GREEN}✓${NC}  NexPanel service"
    echo -e "    ${GREEN}✓${NC}  Nginx configurations"
    echo -e "    ${GREEN}✓${NC}  PHP-FPM pools"
    echo -e "    ${GREEN}✓${NC}  PM2 processes"
    echo -e "    ${GREEN}✓${NC}  Website directories"
    echo -e "    ${GREEN}✓${NC}  Backup directories"
    echo -e "    ${GREEN}✓${NC}  Database files"
    echo -e "    ${GREEN}✓${NC}  Log files"
    echo -e "    ${GREEN}✓${NC}  User accounts"
    echo -e "    ${GREEN}✓${NC}  Cron jobs"
    echo ""
    echo -e "  ${YELLOW}Note: The following were NOT removed:${NC}"
    echo -e "    ${YELLOW}•${NC}  Node.js (installed via package manager)"
    echo -e "    ${YELLOW}•${NC}  MariaDB/MySQL"
    echo -e "    ${YELLOW}•${NC}  Nginx"
    echo -e "    ${YELLOW}•${NC}  PHP versions"
    echo -e "    ${YELLOW}•${NC}  Redis"
    echo ""
    echo -e "  ${WHITE}To remove Node.js manually:${NC}"
    echo -e "    ${CYAN}sudo apt remove nodejs npm${NC}"
    echo ""
    echo -e "  ${WHITE}To remove MariaDB manually:${NC}"
    echo -e "    ${CYAN}sudo apt remove mariadb-server${NC}"
    echo ""
    echo -e "${GREEN}${BOX_BOTTOM}$(printf '%.0s' {1..68})${BOX_BOTTOM_CORNER}"
    echo ""
}

# Main function
main() {
    check_root
    check_installation
    confirm_uninstall
    
    # Execute all steps
    step1_stop_services
    step2_remove_nginx
    step3_remove_php
    step4_remove_websites
    step5_remove_backups
    step6_remove_data
    step7_remove_users
    step8_remove_cron
    step9_final_cleanup
    
    print_completion
}

# Run main function
main
