import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { Playlist } from "../models/playlist.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const pipeline = [];

  if (query) {
    pipeline.push({
      $search: {
        index: "search-videos",
        text: {
          query: query,
          path: ["title", "description"],
        },
      },
    });
  }

  // if (userId) {
  //   if (!isValidObjectId(userId)) {
  //     throw new ApiError(400, "Invalid User");
  //   }

  //   pipeline.push({
  //     $match: {
  //       owner: new mongoose.Types.ObjectId(userId),
  //     },
  //   });
  // }

  pipeline.push({ $match: { isPublished: true } });

  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$ownerDetails",
    }
  );

  const videoAggregate = Video.aggregate(pipeline);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const video = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Videos Fetched Successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Title and description is required");
  }

  const videoLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!videoLocalPath) {
    throw new ApiError(400, "video file local path is not found");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail file local path is not found");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);

  const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new ApiError(404, "The video file is not found");
  }

  if (!thumbnailFile) {
    throw new ApiError(404, "The thumbnail file is not found");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnailFile.url,
    title,
    description,
    duration: videoFile?.duration,
    owner: req.user?._id,
    isPublished: false,
  });

  if (!video) {
    throw new ApiError(400, "The video is not uploaded on mongo DB");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, video, "The video file is uploaded successfully")
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "the video id is not valid");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        videoFile: 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);
  if (!video) {
    throw new ApiError(500, "Failed to fetch video");
  }
  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });
  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });
  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video details fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const videoToBeUpdated = await Video.findById(videoId);

  if (videoToBeUpdated.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "You are not authorized to update this video");
  }

  const thumbnailLocalPath = req.file?.path;

  if (!title || !description || !thumbnailLocalPath) {
    throw new ApiError(400, "Please provide title,description or thumbnail");
  }

  let thumbnail;

  if (thumbnailLocalPath) {
    thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail.url) {
      throw new ApiError(
        404,
        "The thumbnail file is not uploaded on the cloudinary"
      );
    } else {
      const oldThumbnailUrl = videoToBeUpdated.thumbnail;

      if (!oldThumbnailUrl) {
        throw new ApiError(400, "Old thumbnail file is not found");
      } else {
        const isFileDeleted = await deleteFromCloudinary(oldThumbnailUrl);

        if (!isFileDeleted) {
          throw new ApiError(400, "Old file is not deleted successfully");
        }
      }
    }
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnail.url,
      },
    },
    { new: true }
  );

  if (!video) {
    throw new ApiError(400, "video is not updated successfully");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "The video is updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "The video id is not valid");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "The video is not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "You are not authorized to delete this video");
  }

  const deletedVideo = await Video.findByIdAndDelete(videoId);

  if (!deletedVideo) {
    throw new ApiError(400, "The video is not deleted from the database");
  }

  //Delete all the instances of video from the comments

  const deletedComments = await Comment.deleteMany({ video: videoId });

  if (!deletedComments) {
    throw new ApiError(400, "The video comments are not deleted successfully");
  }
  //----------------------------------------------------------------------------

  //Delete all the instances of the video from the likes

  const deletedLikes = await Like.deleteMany({ video: videoId });

  if (!deletedLikes) {
    throw new ApiError(400, "The video likes are not deleted successfully");
  }
  //------------------------------------------------------------------------------

  //Delete the instances of the video from the playlist

  const deletedVideoFromPlaylist = await Playlist.updateMany(
    {},
    { $pull: { videos: videoId } },
    { multi: true }
  );

  if (!deletedVideoFromPlaylist) {
    throw new ApiError(400, "The video is not deleted from the playlists");
  }

  //-------------------------------------------------------------------------------------

  //Delete the video from the watch history of the users

  const deletedVideFromWatchHistory = await User.updateMany(
    {},
    { $pull: { watchHistory: videoId } },
    { multi: true }
  );

  if (!deletedVideFromWatchHistory) {
    throw new ApiError(400, "The video is not deleted from the watch history");
  }

  //----------------------------------------------------------------------------------------

  //Delete the vidoe files from cloudinary

  const deleteVideoFile = await deleteFromCloudinary(video.videoFile, "video");

  const deleteThumbnail = await deleteFromCloudinary(video.thumbnail);

  if (!deleteVideoFile) {
    throw new ApiError(400, "The video file is not deleted from cloudinary");
  }

  if (!deleteThumbnail) {
    throw new ApiError(
      400,
      "The thumbnail file is not deleted from cloudinary"
    );
  }
  //---------------------------------------------------------------------------------------------
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "The video is deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError("404", "The video is not found");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "You are not authorized to edit this video");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video?.isPublished,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedVideo) {
    throw new ApiError(400, "The publish status is not changed");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: updateVideo.isPublished },
        "The publish status is changed successfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
