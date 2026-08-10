"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUSES = exports.PRIORITIES = exports.CATEGORIES = void 0;
exports.CATEGORIES = [
    'billing',
    'account',
    'order_delivery',
    'refund_cancellation',
    'technical',
    'product_service',
    'complaint',
    'general_question',
    'security_abuse',
    'out_of_scope',
    'unknown'
];
exports.PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
exports.STATUSES = [
    'pending',
    'processing',
    'completed',
    'failed',
    'human_review'
];
