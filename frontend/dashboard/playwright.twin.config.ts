import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir:'./tests', testMatch:'twinBackend.spec.ts',workers:1,fullyParallel:false,timeout:90000,
  reporter:'list',use:{baseURL:'http://127.0.0.1:5184',channel:'chrome',viewport:{width:1440,height:1080},screenshot:'only-on-failure'},
  webServer:[
    {command:`"${resolve('../../.venv-twin/Scripts/python.exe')}" -m uvicorn app.main:app --app-dir ../../ml-service --host 127.0.0.1 --port 18084`,url:'http://127.0.0.1:18084/health',reuseExistingServer:false,timeout:90000,
      env:{MODEL_PATH:resolve('../../ml-service/app/artifacts/logistic_regression.joblib'),MODEL_METADATA_PATH:resolve('../../ml-service/app/artifacts/model_metadata.json')}},
    {command:'mvn -q -f ../../backend/fusion-api/pom.xml spring-boot:run',url:'http://127.0.0.1:18085/actuator/health',reuseExistingServer:false,timeout:120000,
      env:{SERVER_PORT:'18085',SPRING_DATASOURCE_URL:'jdbc:h2:mem:twin-browser;DB_CLOSE_DELAY=-1',ML_SERVICE_URL:'http://127.0.0.1:18084',CORS_ALLOWED_ORIGINS:'http://127.0.0.1:5184'}},
    {command:'npm run dev -- --host 127.0.0.1 --port 5184 --strictPort',url:'http://127.0.0.1:5184',reuseExistingServer:false,env:{VITE_API_BASE_URL:'http://127.0.0.1:18085'}},
  ],
});
