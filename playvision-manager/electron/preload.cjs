const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // MACHINES
  getMachines: () => ipcRenderer.invoke('machines:get'),
  createMachine: m => ipcRenderer.invoke('machines:create', m),
  addMachine: m => ipcRenderer.invoke('machines:create', m),
  updateMachine: m => ipcRenderer.invoke('machines:update', m),
  deleteMachine: id => ipcRenderer.invoke('machines:delete', id),
  reserveMachineId: () => ipcRenderer.invoke('machines:reserveId'),
  releaseMachineId: id => ipcRenderer.invoke('machines:releaseId', id),
  createPlaySession: session => ipcRenderer.invoke('play-sessions:create', session),
  updatePlaySession: session => ipcRenderer.invoke('play-sessions:update', session),
  getPlaySessions: () => ipcRenderer.invoke('play-sessions:get'),
  logMachinePlaytime: data => ipcRenderer.invoke('machine-playtime:log', data),
  getMachinePlaytime: clientId => ipcRenderer.invoke('machine-playtime:get', clientId),

  // STOCK
  getStockItems: () => ipcRenderer.invoke('stock:get'),
  createStockItem: item => ipcRenderer.invoke('stock:create', item),
  updateStockItem: item => ipcRenderer.invoke('stock:update', item),
  deleteStockItem: id => ipcRenderer.invoke('stock:delete', id),
  // CATEGORIES
  getCategories: () => ipcRenderer.invoke('categories:get'),
  createCategory: category => ipcRenderer.invoke('categories:create', category),
  // SALES
  createSale: sale => ipcRenderer.invoke('sales:create', sale),
  getSales: () => ipcRenderer.invoke('sales:get'),
  getSalesSummary: () => ipcRenderer.invoke('sales:summary'),

  // CLIENTS
  getClients: () => ipcRenderer.invoke('clients:get'),
  createClient: c => ipcRenderer.invoke('clients:create', c),
  updateClient: c => ipcRenderer.invoke('clients:update', c),
  reserveClientId: () => ipcRenderer.invoke('clients:reserveId'),
  releaseClientId: id => ipcRenderer.invoke('clients:releaseId', id),

  // DATABASE
  getDatabaseInfo: () => ipcRenderer.invoke('database:getInfo'),
  backupDatabase: () => ipcRenderer.invoke('database:backup'),
  restoreDatabase: () => ipcRenderer.invoke('database:restore'),
  clearDatabase: () => ipcRenderer.invoke('database:clear')
})