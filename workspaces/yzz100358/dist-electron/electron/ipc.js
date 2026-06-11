import { ipcMain, dialog } from 'electron';
import * as clientsService from './services/clients';
import * as artistsService from './services/artists';
import * as bodyPartsService from './services/bodyParts';
import * as bookingsService from './services/bookings';
import * as designsService from './services/designs';
import * as depositsService from './services/deposits';
import * as alertsService from './services/alerts';
import * as exportService from './services/export';
import { getDatabasePath } from './database';
import fs from 'fs';
import path from 'path';
export function registerIpcHandlers() {
    ipcMain.handle('clients:list', (_event, filters) => {
        return clientsService.getClients(filters);
    });
    ipcMain.handle('clients:get', (_event, id) => {
        return clientsService.getClientById(id);
    });
    ipcMain.handle('clients:save', (_event, client) => {
        return clientsService.saveClient(client);
    });
    ipcMain.handle('clients:delete', (_event, id) => {
        return clientsService.deleteClient(id);
    });
    ipcMain.handle('artists:list', (_event, activeOnly = true) => {
        return artistsService.getArtists(activeOnly);
    });
    ipcMain.handle('artists:save', (_event, artist) => {
        return artistsService.saveArtist(artist);
    });
    ipcMain.handle('bodyParts:list', () => {
        return bodyPartsService.getBodyParts();
    });
    ipcMain.handle('bookings:list', (_event, filters) => {
        return bookingsService.getBookings(filters);
    });
    ipcMain.handle('bookings:get', (_event, id) => {
        return bookingsService.getBookingById(id);
    });
    ipcMain.handle('bookings:checkConflict', (_event, artistId, startTime, endTime, excludeBookingId) => {
        return bookingsService.checkTimeConflict(artistId, startTime, endTime, excludeBookingId);
    });
    ipcMain.handle('bookings:save', (_event, booking) => {
        return bookingsService.saveBooking(booking);
    });
    ipcMain.handle('bookings:cancel', (_event, id) => {
        return bookingsService.cancelBooking(id);
    });
    ipcMain.handle('bookings:today', (_event, artistId) => {
        return bookingsService.getTodayBookings(artistId);
    });
    ipcMain.handle('designs:list', (_event, filters) => {
        return designsService.getDesigns(filters);
    });
    ipcMain.handle('designs:get', (_event, id) => {
        return designsService.getDesignById(id);
    });
    ipcMain.handle('designs:save', (_event, design) => {
        return designsService.saveDesign(design);
    });
    ipcMain.handle('designs:delete', (_event, id) => {
        return designsService.deleteDesign(id);
    });
    ipcMain.handle('designs:checkImages', () => {
        return designsService.checkAllImages();
    });
    ipcMain.handle('designs:uploadImage', async (_event, sourcePath, designId) => {
        return designsService.uploadDesignImage(sourcePath, designId);
    });
    ipcMain.handle('deposits:uploadImage', async (_event, sourcePath, bookingId) => {
        return designsService.uploadDepositImage(sourcePath, bookingId);
    });
    ipcMain.handle('deposits:list', (_event, bookingId) => {
        return depositsService.getDeposits(bookingId);
    });
    ipcMain.handle('deposits:save', (_event, deposit) => {
        return depositsService.saveDeposit(deposit);
    });
    ipcMain.handle('alerts:generate', () => {
        return alertsService.generateAllAlerts();
    });
    ipcMain.handle('export:confirmation', async (_event, bookingId, version) => {
        const result = await dialog.showSaveDialog({
            title: '导出确认单',
            defaultPath: `预约确认单_${bookingId}_${version === 'client' ? '客户版' : '内部版'}.pdf`,
            filters: [{ name: 'PDF文件', extensions: ['pdf'] }],
        });
        if (result.canceled || !result.filePath) {
            return { success: false, filePath: null };
        }
        return exportService.exportConfirmation(bookingId, version, result.filePath);
    });
    ipcMain.handle('dialog:openFile', async (_event, filters) => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: filters || [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
        });
        if (result.canceled)
            return null;
        return result.filePaths[0];
    });
    ipcMain.handle('dialog:openDirectory', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
        });
        if (result.canceled)
            return null;
        return result.filePaths[0];
    });
    ipcMain.handle('fs:fileExists', (_event, filePath) => {
        return fs.existsSync(filePath);
    });
    ipcMain.handle('fs:readFile', (_event, filePath) => {
        return fs.readFileSync(filePath, 'base64');
    });
    ipcMain.handle('app:getDbPath', () => {
        return getDatabasePath();
    });
    ipcMain.handle('app:backupDb', async () => {
        const dbPath = getDatabasePath();
        const result = await dialog.showSaveDialog({
            title: '备份数据库',
            defaultPath: `tattoo-studio-backup-${Date.now()}.db`,
            filters: [{ name: '数据库文件', extensions: ['db'] }],
        });
        if (result.canceled || !result.filePath) {
            return { success: false, filePath: null };
        }
        fs.copyFileSync(dbPath, result.filePath);
        return { success: true, filePath: result.filePath };
    });
    ipcMain.handle('app:restoreDb', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: '数据库文件', extensions: ['db'] }],
        });
        if (result.canceled)
            return { success: false };
        const dbPath = getDatabasePath();
        const backupPath = path.join(path.dirname(dbPath), `backup-${Date.now()}.db`);
        fs.copyFileSync(dbPath, backupPath);
        fs.copyFileSync(result.filePaths[0], dbPath);
        return { success: true, backupPath };
    });
}
export default { registerIpcHandlers };
