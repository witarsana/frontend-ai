#!/usr/bin/env node

// Port configuration reader utility
const fs = require('fs');
const path = require('path');

class PortConfig {
  constructor() {
    const configPath = path.join(__dirname, 'ports.json');
    try {
      this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('❌ Failed to load port configuration:', error.message);
      process.exit(1);
    }
  }

  get backend() {
    return this.config.backend;
  }

  get frontend() {
    return this.config.frontend;
  }

  get urls() {
    return this.config.urls;
  }

  // Get port by service name
  getPort(service) {
    return this.config[service]?.port;
  }

  // Get host by service name
  getHost(service) {
    return this.config[service]?.host;
  }

  // Get full URL by service name
  getUrl(service) {
    if (service === 'api_docs') {
      return this.config.urls.api_docs;
    }
    return this.config.urls[service];
  }

  // Export environment variables
  exportEnv() {
    return {
      BACKEND_PORT: this.backend.port,
      BACKEND_HOST: this.backend.host,
      FRONTEND_PORT: this.frontend.port,
      FRONTEND_HOST: this.frontend.host,
      API_BASE_URL: this.urls.backend
    };
  }

  // Print configuration
  print() {
    console.log('🔧 Port Configuration:');
    console.log(`   Backend:  ${this.urls.backend}`);
    console.log(`   Frontend: ${this.urls.frontend}`);
    console.log(`   API Docs: ${this.urls.api_docs}`);
  }
}

// CLI usage
if (require.main === module) {
  const config = new PortConfig();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    config.print();
  } else if (args[0] === 'backend-port') {
    console.log(config.backend.port);
  } else if (args[0] === 'frontend-port') {
    console.log(config.frontend.port);
  } else if (args[0] === 'backend-url') {
    console.log(config.urls.backend);
  } else if (args[0] === 'frontend-url') {
    console.log(config.urls.frontend);
  } else if (args[0] === 'env') {
    const env = config.exportEnv();
    Object.entries(env).forEach(([key, value]) => {
      console.log(`export ${key}=${value}`);
    });
  } else {
    console.log('Usage: node port-config.js [backend-port|frontend-port|backend-url|frontend-url|env]');
  }
}

module.exports = PortConfig;
