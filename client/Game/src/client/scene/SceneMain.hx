package client.scene;

import h2d.Scene;

class SceneMain extends Scene {
	private final fui:h2d.Flow;
	private final gui:Gui;

	public function new(level1Callback:Void->Void, level2Callback:Void->Void) {
		super();

		fui = new h2d.Flow(this);
		fui.layout = Vertical;
		fui.verticalSpacing = 5;
		fui.padding = 10;
		fui.y = 10;

		gui = new Gui(fui);

		// TODO place in center and scale
		gui.addButton("Demo 1", function() {
			level1Callback();
		});

		gui.addButton("Online 1", function() {
			level2Callback();
		});
	}
}