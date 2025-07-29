import { ComputerImage } from "@joshu/sdk";

const computer = new ComputerImage({
	name: "SimpleTestComputer",
	apps: [],
});


await computer.start();

