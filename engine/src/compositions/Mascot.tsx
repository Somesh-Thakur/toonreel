import React from "react";
import { AbsoluteFill } from "remotion";
import { Character2D, type CharacterLook, type CharacterPose } from "../components/Character2D";

/** Transparent still of a reel character, for the website / thumbnails. */
export const Mascot: React.FC<{ look: CharacterLook; pose?: CharacterPose }> = ({ look, pose }) => (
  <AbsoluteFill>
    <Character2D look={look} pose={pose} scale={1} x={540} y={1920} />
  </AbsoluteFill>
);
