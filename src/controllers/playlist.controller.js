import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    throw new ApiError(400, "Please provide the name of the playlist");
  }

  if (!description) {
    description = "Default Description";
  }

  const playlist = await Playlist.findOne({
    name: name,
    owner: req.user?._id,
  });

  if (playlist) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          playlist,
          "The playlist is already existed with this name"
        )
      );
  }

  const newPlaylist = await Playlist.create({
    name,
    description,
    owner: req.user?._id,
  });

  if (!newPlaylist) {
    throw new ApiError(400, "Error in creating the playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, newPlaylist, "The playlist is created successfully")
    );
});

const getUserPlaylist = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "The user id is not valid");
  }

  const getPlaylist = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $addFields: {
        totalVideos: {
          $size: "$videos",
        },
        totalViews: {
          $sum: "$videos.views",
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        totalVideos: 1,
        totalViews: 1,
        videos: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (!getPlaylist.length) {
    throw new ApiError(404, "The playlist is not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        getPlaylist,
        "The user playlist is fetched successfully"
      )
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "The playlist id is not valid");
  }

  // const playlist = await Playlist.findById(playlistId);

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },

    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    avatar: 1,
                    username: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              thumbnail: 1,
              title: 1,
              duration: 1,
              createdAt: 1,
              owner: 1,
              views: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        totalViews: {
          $sum: "$videos.views",
        },
      },
    },
  ]);

  if (!playlist) {
    throw new ApiError(
      404,
      "The playlist is not found for the given playlist id"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "The playlist is fetched successfully")
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "The playlist id is not valid");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "The video id is not valid");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "The playlist is not found");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "The video not found");
  }

  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "The user is not authorized to add video in this playlist"
    );
  }

  const updatedPlaylist = await Playlist.updateOne(
    {
      _id: playlistId,
      owner: req.user?._id,
    },
    {
      $addToSet: {
        videos: videoId,
      },
    }
  );

  if (!updatedPlaylist) {
    throw new ApiError(400, "The video is not added to the playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "The video is added to the playlist"
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "The playlist id is not valid");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "The video id is not valid");
  }

  const playlist = await Playlist.findOne({
    _id: playlistId,
    owner: req.user?._id,
  });

  if (!playlist) {
    throw new ApiError(404, "The playlist is not found for the current user");
  }

  const updatedPlaylist = await Playlist.updateOne(
    {
      _id: playlistId,
      owner: req.user?._id,
    },
    {
      $pull: { videos: videoId },
    }
  );

  if (!updatedPlaylist) {
    throw new ApiError(400, "The video is not removed from the playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatePlaylist,
        "The video is removed successfully from playlist"
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "The playlist id is not valid");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "The playlist does not exist");
  }

  const deletedPlaylist = await Playlist.deleteOne({
    _id: playlistId,
    owner: req.user?._id,
  });

  if (!deletedPlaylist) {
    throw new ApiError(400, "The playlist is not deleted");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "The playlist is deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "The playlist id is not valid");
  }

  if (!name && !description) {
    throw new ApiError(400, "Please provide name or description");
  }

  const playlist = await Playlist.findOne({
    _id: playlistId,
    owner: req.user._id,
  });

  if (!playlist) {
    throw new ApiError(404, "The playlist is not found");
  }

  const updateObj = {};

  if (name) updateObj.name = name;

  if (description) updateObj.description = description;

  let result;

  if (Object.keys(updateObj).length > 0) {
    result = await Playlist.updateOne(
      {
        _id: playlistId,
        owner: req.user?._id,
      },
      {
        $set: updateObj,
      }
    );
  }

  if (!result) {
    throw new ApiError(400, "The playlist is not updated");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, result, "the Playlist is updated successfully"));
});

export {
  createPlaylist,
  getUserPlaylist,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
