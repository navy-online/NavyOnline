package client.network;

import client.network.RestProtocol.Player;
import client.network.RestProtocol.GameWorld;
import haxe.http.HttpJs;

class Rest {
	public static final instance:Rest = new Rest();

	private function new() {}

	public function signInOrUp(ethAddress:String, callback:Player->Void) {
		final req = new HttpJs("http://localhost:3000/app/signInOrUp");
		final body = {ethAddress: ethAddress};
		req.setPostData(haxe.Json.stringify(body));
		req.addHeader("Content-type", "application/json");
		req.request(true);
		req.onData = function onData(data:String) {
			if (callback != null) {
				final json = haxe.Json.parse(data);
				callback(new Player(json.ethAddress, json.nickname, json.worldX, json.worldY, json.worldState));
			}
		};
	}

	public function getWorldInfo(callback:GameWorld->Void) {
		final req = new HttpJs("http://localhost:3000/app/world");
		req.request();
		req.onData = function onData(data:String) {
			if (callback != null) {
				final json = haxe.Json.parse(data);
				callback(new GameWorld(json.size, json.sectors));
			}
		};
	}

	public function worldMove(ethAddress:String, x:Int, y:Int, callback:Bool->Void) {
		final req = new HttpJs("http://localhost:3000/app/world/move");
		final body = {
			ethAddress: ethAddress,
			x: x,
			y: y
		};
		req.setPostData(haxe.Json.stringify(body));
		req.addHeader("Content-type", "application/json");
		req.request(true);
		req.onData = function onData(data:String) {
			if (callback != null) {
				final json = haxe.Json.parse(data);
				callback(json.result);
			}
		};
	}
}
