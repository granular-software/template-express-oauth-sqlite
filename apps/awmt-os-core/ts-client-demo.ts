import AWMT from "./ts-client";

const awmt = new AWMT(process.env.AWMT_TOKEN);

awmt.state_machine("ticket").on_state("created", async function (ticket, machine) {

    const created_at = await ticket.string_value("date")
    const creator = await ticket.string_value("creator")
    const title = await ticket.string_value("title")

    const possible_states = await machine.get_possible_next_states(ticket)

    const slack_message = `Ticket created by ${creator} at ${created_at}. Possible next states: ${possible_states.join(", ")}`

    return true

})


awmt.state_machine("api_x_token_refresh").on_state("expired", async function (token, machine) {

    // rafrsh token

    const public_key = await token.string_value("public_key")
    const private_key = await token.string_value("private_key")

    const scopes = await token.string_array_value("scopes")


    return true

})

awmt.state_machine("api_x_call").on_state("call_failed", async function (call, machine) {

   const explanation = await machine.why() 

})










































awmt.state_machine("ticket").on_state("created", async function (ticket, machine) {
	const created_at = await ticket.string_value("date");

	const creator = await ticket.at("creator")

	const possible_states = await machine.get_possible_next_states(ticket);

    const slack_message = `Ticket created by ${creator} at ${created_at}. Possible next states: ${possible_states.join(", ")}`;

    // Send slack message via Slack API
    return true
});
