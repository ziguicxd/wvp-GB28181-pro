require('./h265webjs-v20221106');
export default class h265webjs {
	static createPlayer(videoURL, config) {
		return window.new265webjs(videoURL, config);
	}

	static clear() {
		global.STATICE_MEM_playerCount = -1;
		global.STATICE_MEM_playerIndexPtr = 0;
    }
}
