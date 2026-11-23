import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
// Instagram-friendly quality (lower = better). 18 is visually lossless.
Config.setCrf(18);
