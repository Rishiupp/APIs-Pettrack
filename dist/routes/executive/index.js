"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const executive_controller_1 = require("../../controllers/executive/executive.controller");
const authenticate_1 = require("../../middleware/auth/authenticate");
const authorize_1 = require("../../middleware/auth/authorize");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate);
router.post('/pets/register', authorize_1.requireExecutive, executive_controller_1.ExecutiveController.registerPet);
router.get('/registrations', authorize_1.requireExecutive, executive_controller_1.ExecutiveController.getRegistrationHistory);
router.get('/stats', authorize_1.requireExecutive, executive_controller_1.ExecutiveController.getExecutiveStats);
router.get('/profile', authorize_1.requireExecutive, executive_controller_1.ExecutiveController.getProfile);
router.patch('/profile', authorize_1.requireExecutive, executive_controller_1.ExecutiveController.updateProfile);
router.get('/reports/daily', authorize_1.requireExecutive, executive_controller_1.ExecutiveController.getDailyReport);
router.get('/admin/all', authorize_1.requireAdmin, executive_controller_1.ExecutiveController.getAllExecutives);
router.post('/admin/create', authorize_1.requireAdmin, executive_controller_1.ExecutiveController.createExecutive);
router.post('/admin/:executiveId/deactivate', authorize_1.requireAdmin, executive_controller_1.ExecutiveController.deactivateExecutive);
exports.default = router;
//# sourceMappingURL=index.js.map