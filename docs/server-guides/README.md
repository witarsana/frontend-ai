# 📚 Server Guides Documentation

Panduan lengkap untuk deployment, development, dan maintenance server.

## 📖 Available Guides

### 🚀 [Quick Reference Card](./QUICK_REFERENCE.md)
Essential commands dan workflows untuk development sehari-hari.
- Start/stop services
- Development updates  
- Docker operations
- Troubleshooting commands

### 📋 [Complete Deployment Guide](./README_DEPLOYMENT.md)
Panduan lengkap untuk deployment dan development workflows.
- Environment setup
- Docker vs Local development
- Network sharing configuration
- Update code workflows
- Team collaboration

### 🐳 [Docker Speaker Setup](./DOCKER_SPEAKER_SETUP.md)
Advanced Docker configuration untuk speaker detection system.
- Container orchestration
- Network management
- Performance tuning
- Resource monitoring

## 🎯 Quick Navigation

### For Developers
1. Start here: [Quick Reference Card](./QUICK_REFERENCE.md)
2. Detailed workflows: [Deployment Guide](./README_DEPLOYMENT.md)
3. Docker specifics: [Docker Setup](./DOCKER_SPEAKER_SETUP.md)

### For DevOps/Deployment
1. Production setup: [Deployment Guide](./README_DEPLOYMENT.md)
2. Container management: [Docker Setup](./DOCKER_SPEAKER_SETUP.md)
3. Monitoring: [Quick Reference](./QUICK_REFERENCE.md#troubleshooting)

### For Team Leads
1. Team collaboration: [Deployment Guide - Network Sharing](./README_DEPLOYMENT.md#network-sharing-setup)
2. Development workflows: [Quick Reference - Workflows](./QUICK_REFERENCE.md#development-workflows)
3. Emergency procedures: [Quick Reference - Emergency](./QUICK_REFERENCE.md#emergency-commands)

## 🔧 Essential Commands Summary

```bash
# Quick start
./start.sh

# Development update
./dev-update.sh frontend-update

# Team sharing
./configure-network.sh && ./start.sh

# Emergency restart
./stop.sh && ./start.sh --rebuild
```

## 📁 Related Documentation

- [Main README](../../README.md) - Project overview
- [API Documentation](../README.md) - API guides
- [Demo Guides](../../demo/) - Usage examples
