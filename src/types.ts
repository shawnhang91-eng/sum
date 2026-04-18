/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GameMode {
  CLASSIC = 'CLASSIC',
  TIME = 'TIME',
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
}

export interface BlockData {
  id: string;
  value: number;
  selected: boolean;
  row: number;
  col: number;
  highlighted?: boolean; // For visual feedback of sum match
}

export interface GameStats {
  score: number;
  level: number;
  targetSum: number;
  timeLeft: number;
  currentSum: number;
}
