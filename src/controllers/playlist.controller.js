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
    throw new ApiError(400, "Please provide the description of the playlist");
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
        owner: userId,
      },
    },
    {
      $lookup: {
        from: "videos",
        let: {
          videoIds: "$videos",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$_id", "$$videoIds"],
              },
            },
          },
        ],
        as: "userPlaylistVideos",
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        userPlaylistVideos: 1,
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

  const playlist = await Playlist.findById(playlistId);

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
        video: videoId,
      },
    }
  );

  if (!updatePlaylist) {
    throw new ApiError(400, "The video is not added to the playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatePlaylist, "The video is added to the playlist")
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

  if (name) {
    const updateName = await Playlist.updateOne(
      {
        _id: playlistId,
        owner: req.user?._id,
      },
      {
        $set: {
          name,
        },
      }
    );
  }

  if (description) {
    const updateDesc = await Playlist.updateOne(
      {
        _id: playlistId,
        owner: req.user?._id,
      },
      {
        $set: {
          description,
        },
      }
    );
  }

  if (updateName || updateDesc) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, playlist, "the Playlist is updated successfully")
      );
  }
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
