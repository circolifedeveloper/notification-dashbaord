import * as broadcastService from "../services/broadcastService.js";
import { assertObjectId } from "../utils/validation.js";

export async function create(req, res) {
    const broadcast = await broadcastService.createBroadcast(req.user, req.body);
    res.status(201).json({ success: true, message: "Broadcast submitted for approval", data: broadcast });
}

export async function list(req, res) {
    const data = await broadcastService.listBroadcasts(req.user, req.query);
    res.json({ success: true, data });
}

export async function detail(req, res) {
    const data = await broadcastService.getBroadcast(assertObjectId(req.params.id));
    res.json({ success: true, data });
}

export async function update(req, res) {
    const data = await broadcastService.updateBroadcast(req.user, assertObjectId(req.params.id), req.body);
    res.json({ success: true, message: "Broadcast updated and sent for approval", data });
}

export async function approve(req, res) {
    const data = await broadcastService.approveBroadcast(req.user, assertObjectId(req.params.id), req.body?.note);
    res.json({ success: true, message: "Broadcast approved", data });
}

export async function reject(req, res) {
    const data = await broadcastService.rejectBroadcast(req.user, assertObjectId(req.params.id), req.body?.reason);
    res.json({ success: true, message: "Broadcast rejected", data });
}

export async function stats(req, res) {
    const data = await broadcastService.getStats();
    res.json({ success: true, data });
}
