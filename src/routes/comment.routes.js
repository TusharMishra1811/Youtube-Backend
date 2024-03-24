import { Router } from "express";
import {
  getVideoComments,
  addComments,
  updateComments,
  deleteComments,
} from "../controllers/comment.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/:videoId").get(getVideoComments).post(addComments);
router.route("/c/:commentId").delete(deleteComments).patch(updateComments);

export default router;
