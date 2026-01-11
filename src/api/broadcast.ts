import { Router, Request, Response } from "express";
import { broadcastService } from "../services/BroadcastService";

interface AuthRequest extends Request {
  authUserId?: string;
}

export function createBroadcastRoutes(): Router {
  const router = Router();

  // Require auth
  router.use((req: AuthRequest, res: Response, next) => {
    if (!req.authUserId) return res.status(401).json({ error: "Unauthorized" });
    next();
  });

  // Start
  router.post("/start", (req: AuthRequest, res: Response) => {
    res.json(broadcastService.start(req.authUserId!));
  });

  // Stop
  router.post("/stop", (req: AuthRequest, res: Response) => {
    res.json(broadcastService.stop(req.authUserId!));
  });

  // Send
  router.post("/send", (req: AuthRequest, res: Response) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text required" });
    res.json(broadcastService.send(req.authUserId!, text));
  });

  // Status
  router.get("/status", (req: AuthRequest, res: Response) => {
    res.json(broadcastService.getStatus(req.authUserId!));
  });

  // Join (listener joins broadcaster by email)
  router.post("/join", (req: AuthRequest, res: Response) => {
    const { broadcasterEmail } = req.body;
    if (!broadcasterEmail) return res.status(400).json({ error: "broadcasterEmail required" });
    res.json(broadcastService.join(req.authUserId!, broadcasterEmail));
  });

  // Leave
  router.post("/leave", (req: AuthRequest, res: Response) => {
    const { broadcasterEmail } = req.body;
    res.json(broadcastService.leave(req.authUserId!, broadcasterEmail));
  });

  // Get messages (for listener webview polling)
  router.get("/messages", (req: AuthRequest, res: Response) => {
    const { broadcaster } = req.query;
    if (!broadcaster) return res.status(400).json({ error: "broadcaster required" });
    res.json({ 
      live: broadcastService.isLive(broadcaster as string),
      messages: broadcastService.getMessages(broadcaster as string) 
    });
  });

  return router;
}
