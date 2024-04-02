import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "The videoId is not valid");
  }

  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
  ]);

  if (!comments) {
    throw new ApiError(404, "The video does not have any comments");
  }

  const paginatedComments = await Comment.aggregatePaginate(comments, {
    page,
    limit,
  });

  if (!paginatedComments) {
    throw new ApiError(400, "The video does not have any comments");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        paginatedComments,
        "The comments are fetched successfully"
      )
    );
});

const addComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "The video id is not valid");
  }

  if (!content) {
    throw new ApiError(400, "Please provide the content for the comment");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "The video is not found");
  }

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });

  if (!comment) {
    throw new ApiError(400, "The comment is not added");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "The comment is added successfully"));
});

const updateComments = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { updatedContent } = req.body;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "The comment id is not valid");
  }

  if (!updatedContent) {
    throw new ApiError(400, "Please provide the content");
  }

  const comment = await Comment.findOneAndUpdate(
    {
      _id: commentId,
      owner: req.user?._id,
    },
    {
      $set: {
        content: updatedContent,
      },
    },
    {
      returnOriginal: false,
    }
  );

  if (!comment) {
    throw new ApiError(400, "The comment is not updated successfully");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "The comment is updated sucessfully"));
});

const deleteComments = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "The comment id is not valid");
  }

  const comment = await Comment.findOneAndDelete({
    _id: commentId,
    owner: req.user?._id,
  });

  if (!comment) {
    throw new ApiError(200, "The comment is not deleted");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "The comment is deleted successfully"));
});

export { getVideoComments, addComments, updateComments, deleteComments };
