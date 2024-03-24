import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
});

const addComments = asyncHandler(async (req, res) => {});

const updateComments = asyncHandler(async (req, res) => {});

const deleteComments = asyncHandler(async (req, res) => {});

export { getVideoComments, addComments, updateComments, deleteComments };
