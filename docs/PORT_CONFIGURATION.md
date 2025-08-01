# 🔧 Centralized Port Configuration (Simplified)

This project uses a simplified centralized port configuration system. All ports are defined in specific constant variables within each application for TypeScript compatibility and ease of use.

## 📁 Port Configuration Locations

### 🎯 **Main Configuration Files**

1. **Frontend Vite Config**: `frontend/vite.config.ts`
   ```typescript
   const PORTS = {
     frontend: 3001,
     backend: 8001
   } as const;
   ```

2. **Frontend API Config**: `frontend/src/config/port-config.ts`
   ```typescript
   const PORTS = {
     backend: 8001,
     frontend: 3001,
     host: 'localhost'
   } as const;
   ```

3. **Backend Server**: `backend/ffmpeg_free_main.py`
   ```python
   BACKEND_PORT = 8001
   BACKEND_HOST = "0.0.0.0"
   ```

## 🚀 Easy Port Management

### Using the Management Script

```bash
# Show current configuration
./manage-ports.sh show

# Show which files contain port configs
./manage-ports.sh files

# Change backend port only
./manage-ports.sh set-backend 8002

# Change frontend port only
./manage-ports.sh set-frontend 3002

# Change both ports at once
./manage-ports.sh set-both 8002 3002

# Reset to default ports (8001, 3001)
./manage-ports.sh reset

# Test if current ports are available
./manage-ports.sh test
```

## 🔧 Manual Configuration

### Current Default Ports
- **Backend**: 8001
- **Frontend**: 3001

### To Change Ports Manually

1. **Update Frontend (Vite)**:
   ```typescript
   // In frontend/vite.config.ts
   const PORTS = {
     frontend: 3002,  // Change this
     backend: 8002    // Change this
   } as const;
   ```

2. **Update Frontend (API Config)**:
   ```typescript
   // In frontend/src/config/port-config.ts
   const PORTS = {
     backend: 8002,   // Change this
     frontend: 3002,  // Change this
     host: 'localhost'
   } as const;
   ```

3. **Update Backend**:
   ```python
   # In backend/ffmpeg_free_main.py
   BACKEND_PORT = 8002  # Change this
   ```

## 🎯 Benefits of This Approach

- **TypeScript Compatible**: No import issues with JSON files
- **No External Dependencies**: Works without additional config loaders
- **Simple to Understand**: Direct constant definitions
- **IDE Friendly**: Full IntelliSense and error checking
- **Fast Startup**: No runtime file reading required

## 🛠️ Development Workflow

### Changing Ports for Team Development
```bash
# Developer 1 - use default ports
./manage-ports.sh reset

# Developer 2 - avoid conflicts  
./manage-ports.sh set-both 8002 3002

# Developer 3 - further avoid conflicts
./manage-ports.sh set-both 8003 3003
```

### Testing Port Availability
```bash
./manage-ports.sh test
```

## 📂 File Structure

```
frontend-ai/
├── manage-ports.sh                 # Port management script
├── frontend/
│   ├── vite.config.ts             # Frontend dev server config
│   └── src/config/port-config.ts  # Frontend API config
├── backend/
│   └── ffmpeg_free_main.py        # Backend server config
└── config/
    ├── ports.json                 # Optional JSON config
    └── ports.env                  # Optional env config
```

## 🚨 Port Conflicts

### Common Conflicts
- **3000**: Create React App default
- **3001**: Next.js fallback
- **8000**: Django/FastAPI common default
- **8080**: Many development servers

### Quick Resolution
```bash
# Test current ports
./manage-ports.sh test

# If conflicts, change to available ports
./manage-ports.sh set-both 8005 3005
```

## 🔄 Migration from JSON Config

If you were using the JSON-based config and want to switch:

1. Check current ports: `./manage-ports.sh show`
2. Note the current backend and frontend ports
3. Use the script to update: `./manage-ports.sh set-both [backend] [frontend]`

The script automatically updates all necessary files.

---

**Need help?** Run `./manage-ports.sh` to see all available commands.
