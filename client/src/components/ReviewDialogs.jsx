import { useState } from "react";
import toast from "react-hot-toast";
import Modal from "./Modal.jsx";
import { broadcastApi } from "../api/endpoints.js";
import { errorMessage } from "../api/client.js";

export function RejectDialog({ broadcast, onClose, onDone }) {
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (reason.trim().length < 3) {
            toast.error("Please write a reason (at least 3 characters)");
            return;
        }
        setSaving(true);
        try {
            const updated = await broadcastApi.reject(broadcast._id, reason.trim());
            toast.success("Broadcast rejected");
            onDone?.(updated);
            onClose();
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={Boolean(broadcast)}
            title="Reject broadcast"
            onClose={onClose}
            footer={
                <>
                    <button className="btn-secondary" onClick={onClose} disabled={saving}>
                        Cancel
                    </button>
                    <button className="btn-danger" onClick={submit} disabled={saving}>
                        {saving ? "Rejecting..." : "Reject"}
                    </button>
                </>
            }
        >
            <p className="mb-3 text-sm text-slate-600">
                Tell the creator why <span className="font-medium text-slate-900">{broadcast?.title}</span> is being rejected.
                They can edit and resubmit it.
            </p>
            <label className="label" htmlFor="reject-reason">
                Reason
            </label>
            <textarea
                id="reject-reason"
                className="input min-h-28"
                maxLength={1000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. The image link is broken, please use the new banner."
                autoFocus
            />
            <p className="mt-1 text-right text-xs text-slate-400">{reason.length}/1000</p>
        </Modal>
    );
}

export function ApproveDialog({ broadcast, onClose, onDone }) {
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        try {
            const updated = await broadcastApi.approve(broadcast._id, note.trim() || undefined);
            toast.success(updated.scheduledAt && new Date(updated.scheduledAt) > new Date() ? "Approved and scheduled" : "Approved, delivery started");
            onDone?.(updated);
            onClose();
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={Boolean(broadcast)}
            title="Approve broadcast"
            onClose={onClose}
            footer={
                <>
                    <button className="btn-secondary" onClick={onClose} disabled={saving}>
                        Cancel
                    </button>
                    <button className="btn-success" onClick={submit} disabled={saving}>
                        {saving ? "Approving..." : "Approve and send"}
                    </button>
                </>
            }
        >
            <p className="mb-3 text-sm text-slate-600">
                <span className="font-medium text-slate-900">{broadcast?.title}</span> will be delivered to its audience
                {broadcast?.scheduledAt && new Date(broadcast.scheduledAt) > new Date() ? " at the scheduled time" : " right away"}.
            </p>
            <label className="label" htmlFor="approve-note">
                Note (optional)
            </label>
            <input
                id="approve-note"
                className="input"
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional comment for the history"
            />
        </Modal>
    );
}
