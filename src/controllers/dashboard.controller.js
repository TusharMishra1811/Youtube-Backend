import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
  //(total videos views, total subscribers, total videos, total likes)

  const channel = await User.findById(req.user?._id);

  if (!channel) {
    throw new ApiError(404, "The channel does not exist");
  }

  const channelStats = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        foreignField: "owner",
        localField: "_id",
        as: "totalVideos",
      },
    },
    {
      $lookup: {
        from: "likes",
        foreignField: "likedBy",
        localField: "_id",
        as: "totalLikes",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        foreignField: "channel",
        localField: "_id",
        as: "totalSubscribers",
      },
    },
  ]);

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
      },
    },
    {
      $project: { _id: 1, totalViews: 1 },
    },
  ]);

  if (!channelStats) {
    throw new ApiError(400, "The channel stats are not fetched successfully");
  }

  if (!videos) {
    throw new ApiError(400, "The total views are not fetched successfully");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalVideos: channelStats[0]?.totalVideos.length,
        totalLikes: channelStats[0]?.totalLikes.length,
        totalSubscribers: channelStats[0]?.totalSubscribers.length,
        totalViews: videos[0]?.totalViews,
      },
      "The stats are fetched successfully"
    )
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const channel = await User.findById(req.user?._id);

  if (!channel) {
    throw new ApiError(404, "The channel is not found");
  }

  const video = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $project: {
        _id: 1,
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
      },
    },
  ]);

  if (!video.length > 0) {
    throw new ApiError(400, "The videos are not found for the channel");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "The videos are fetched successfully"));
});

export { getChannelStats, getChannelVideos };
