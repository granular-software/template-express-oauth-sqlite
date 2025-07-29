import { Box } from "../components/Box";
import { Link } from "../components/Link";
import { Text } from "../components/Text";

export default function MarketingPage() {
	return (
		<Box padding={32} background="red">
			<Link label="Home" path="/" />
			
			<Text value="Welcome to our awesome SaaS" onClick={() => 13} />
			<Text value="Coucou les amis" onClick={() => 42} />
		</Box>
	);
}
