// import { Effect } from "effect";
// import { Ant } from "../api/Ant";

// import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import CATEGORY from "../native/feature_categories";

// const s3 = new S3Client({ region: "eu-west-3" });

// export async function uploadFileToS3(fileBuffer: Buffer, bucketName: string, fileName: string): Promise<void> {
// 	const params = {
// 		Bucket: bucketName,
// 		Key: fileName,
// 		Body: fileBuffer,
// 		ContentType: "text/csv",
// 	};

// 	try {
// 		console.log("UPLOADING FILE TO S3", fileBuffer.length, bucketName, fileName);

// 		const s = await s3.send(new PutObjectCommand(params));
// 	} catch (error) {
// 		console.error(error);
// 	}
// }

// export async function getFileFromS3(bucketName: string, fileName: string): Promise<Buffer | undefined> {
// 	const params = {
// 		Bucket: bucketName,
// 		Key: fileName,
// 	};

// 	try {
// 		const data = await s3.send(new GetObjectCommand(params));

// 		const body = await data.Body?.transformToByteArray();

// 		if (body) {
// 			return Buffer.from(body);
// 		}

// 		throw new Error("No body");
// 	} catch (error) {
// 		return undefined;
// 	}
// }

// const bucketName = process.env.AWS_FILES_BUCKET as string;

// const ExportsMap = new Map<string, CsvExport>();

// export default class CsvExport {
// 	constructor(id: string) {
// 		console.log("CsvExport");
// 		this.id = id;
// 	}

// 	protected id: string;
// 	protected handled = 0;
// 	protected total = 0;

// 	protected ant: Ant | null = null;

// 	static create() {
// 		const id = crypto.randomUUID();
// 		const csv = new CsvExport(id);

// 		// const ant = Ant.create_model(id, id, {
// 		// 	instance_of: ["csv_export"],
// 		// });

// 		ExportsMap.set(id, csv);

// 		return csv;
// 	}

// 	static get(id: string) {
// 		return ExportsMap.get(id);
// 	}

// 	static remove(id: string) {
// 		return ExportsMap.delete(id);
// 	}

// 	start(_ant: Ant) {
// 		const set_total = (total: number) => {
// 			this.total = total;
// 		};

// 		const increment_handled = () => {
// 			this.handled = this.handled + 1;
// 		};

// 		const { id } = this;

// 		const handled = () => this.handled;
// 		const total = () => this.total;

// 		console.log("STARTING CSV EXPORT");

// 		return Effect.gen(function* (_) {
// 			yield* _(Effect.logInfo("Exporting CSV"));

// 			const ants = yield* _(_ant.feature_targets());

// 			if (ants.length === 0) {
// 				throw new Error("No target");
// 			}

// 			const __ant = ants[0];

// 			const ant = yield* _(Ant.from_path(__ant.path));

// 			const csv_export_ant = yield* _(_ant.instantiate(id));

// 			if (!csv_export_ant) {
// 				yield* _(Effect.logInfo("No csv export ant"));

// 				throw new Error("No csv export ant");
// 			}

// 			if (!ant) {
// 				throw new Error("No ant");
// 			}

// 			const count_direct_instances = yield* _(ant.it2_count_direct_instances());

// 			yield* _(Effect.logInfo("Count direct instances: " + count_direct_instances));

// 			set_total(count_direct_instances);

// 			yield* _(Effect.logInfo("CSV EXPORT ANT " + csv_export_ant.path));

// 			// yield* _(csv_export_ant.at("total").pipe(Effect.flatMap((a) => a?.set_number_value(count_direct_instances) || Effect.succeed(null))));
// 			yield* _(csv_export_ant.set_number_value_at("total", count_direct_instances));

// 			// yield* _(csv_export_ant.at("date").pipe(Effect.flatMap((a) => a?.set_number_value(new Date().getTime()) || Effect.succeed(null))));
// 			yield* _(csv_export_ant.set_number_value_at("date", new Date().getTime()));

// 			let _submodels = yield* _(ant.deep_submodels(1));

// 			let submodels: {
// 				relative_path: string | null;
// 				label: string;
// 				interfaces: string[];
// 			}[] = [];

// 			let header = "";

// 			if (!_submodels.map((s) => s.tail).includes("operation_type")) {
// 				// The non NGF case

// 				for (let submodel of _submodels) {
// 					if (!submodel) {
// 						yield* _(Effect.logInfo("No submodel"));

// 						continue;
// 					}

// 					const interfaces = yield* _(submodel.provided_interfaces());

// 					// yield* _(Effect.logInfo("Submodel : " + submodel.path + " : " + interfaces?.[0]?.interface));

// 					if (interfaces.map((i) => i.interface.includes("Set"))) {
// 						const property_sources = yield* _(submodel.features(CATEGORY.PROPERTY_SOURCE));

// 						for (let property_source of property_sources) {
// 							let templates = yield* _(property_source.model.features(CATEGORY.SET_TEMPLATE));

// 							// yield* _(Effect.logInfo("Template: " + templates?.[0]?.model.path));

// 							let template = templates?.[0]?.model.path;

// 							if (["string", "number", "boolean", undefined].includes(template)) {
// 								submodels.push({
// 									relative_path: submodel.tail,
// 									label: submodel.label,
// 									interfaces: interfaces.map((i) => i.interface),
// 								});
// 							}
// 						}
// 					} else {
// 						submodels.push({
// 							relative_path: submodel.tail,
// 							label: submodel.label,
// 							interfaces: interfaces.map((i) => i.interface),
// 						});
// 					}
// 				}

// 				for (let submodel of submodels) {
// 					header += submodel.label + ",";
// 				}

// 				header = header.substring(0, header.length - 1);

// 				header += "\n";

// 				// header += submodels.map((submodel) => submodel.label).join(",") + "\n";

// 				// yield* _(Effect.logInfo("Submodels: " + JSON.stringify(submodels, null, 4)));

// 				let has_more = true;
// 				let page = 1;
// 				let page_size = 50;

// 				const _results: (string | null)[][] = [];

// 				while (has_more) {
// 					const new_rows = yield* _(ant.it2_direct_instances(undefined, undefined, page, page_size));

// 					for (let row of new_rows) {
// 						let data: (string | null)[] = [
// 							// row.path.split("_")[0], row.path.split("_")[1]
// 						];

// 						const row_submodels = yield* _(row.submodels());

// 						for (let scalar_submodel of submodels) {
// 							const interfaces = scalar_submodel.interfaces;
// 							if (interfaces.includes("String")) {
// 								const value = yield* _(row_submodels.find((s) => s.tail === scalar_submodel.relative_path)?.string_value() || Effect.succeed(null));
// 								data.push(value || "");
// 							} else if (interfaces.includes("Number")) {
// 								// const value = yield* _(row.number_value(submodel.relative_path || undefined));
// 								const value = yield* _(row_submodels.find((s) => s.tail === scalar_submodel.relative_path)?.number_value() || Effect.succeed(null));
// 								data.push(value?.toString() || "");
// 							} else if (interfaces.includes("Boolean")) {
// 								// const value = yield* _(row.boolean_value(submodel.relative_path || undefined));
// 								const value = yield* _(row_submodels.find((s) => s.tail === scalar_submodel.relative_path)?.boolean_value() || Effect.succeed(null));
// 								data.push(value?.toString() || "");
// 							} else {
// 								let string_array_value = yield* _(row_submodels.find((s) => s.tail === scalar_submodel.relative_path)?.string_array_value() || Effect.succeed(null));
// 								if (string_array_value) {
// 									data.push(string_array_value.length ? string_array_value.join(" | ") : "");
// 								} else {
// 									data.push("");
// 								}

// 								// data.push("");
// 							}
// 						}

// 						yield* _(csv_export_ant.set_number_value_at("handled", handled() + 1));
// 						increment_handled();
// 					}

// 					// for (let row of new_rows) {

// 					// }

// 					has_more = new_rows.length === page_size;
// 					yield* _(Effect.logInfo("Handled: " + handled() + " / " + total()));

// 					page++;

// 					// yield* _(Effect.logInfo("Page " + page + " has_more: " + has_more));
// 				}

// 				let csv_content = "";

// 				csv_content += header;

// 				// const header_operation_date_index = header.split(",").findIndex((h) => h === "operation_date");

// 				csv_content += _results.map((row) => row.join(",").replace(/\/n/g, " | ")).join("\n");

// 				// yield* _(Effect.logInfo("CSV CONTENT: " + csv_content));

// 				const buffer = Buffer.from(csv_content, "utf-8");

// 				yield* _(Effect.tryPromise({ try: async () => await uploadFileToS3(buffer, bucketName, id + ".csv"), catch: (e) => Effect.logError(e) }));

// 				const f = yield* _(Ant.from_path("file"));

// 				if (!f) {
// 					throw new Error("No file");
// 				}

// 				const file_ant = yield* _(f.instantiate());

// 				if (!file_ant) {
// 					throw new Error("No file ant");
// 				}

// 				const presigned_url = yield* _(
// 					Effect.tryPromise(() =>
// 						getSignedUrl(
// 							s3,
// 							new GetObjectCommand({
// 								Bucket: bucketName,
// 								Key: id + ".csv",
// 							}),
// 							{ expiresIn: 60 * 60 * 24 },
// 						),
// 					),
// 				);

// 				yield* _(file_ant.set_string_value_at("format", "csv"));
// 				yield* _(file_ant.set_number_value_at("size", buffer.length));
// 				yield* _(file_ant.set_string_value_at("bucket", bucketName));
// 				yield* _(file_ant.set_string_value_at("key", id + ".csv"));
// 				yield* _(file_ant.set_string_value_at("state", "uploaded"));
// 				yield* _(file_ant.set_string_value_at("presigned_url", presigned_url));

// 				yield* _(Effect.logInfo("Presigned URL: " + presigned_url));
// 				yield* _(Effect.logInfo("File ant: " + file_ant.path));
// 				yield* _(Effect.logInfo("Format: " + "csv"));
// 				yield* _(Effect.logInfo("Size: " + buffer.length));
// 				yield* _(Effect.logInfo("Bucket: " + bucketName));
// 				yield* _(Effect.logInfo("Key: " + id + ".csv"));
// 				yield* _(Effect.logInfo("State: " + "uploaded"));

// 				yield* _(csv_export_ant.at("file").pipe(Effect.flatMap((a) => a?.set_reference(file_ant.path) || Effect.succeed(null))));

// 				// yield* _(Effect.logInfo("Buffer: " + buffer.toString()));

// 				return ant;
// 			}

// 			// yield* _(Effect.logInfo("Submodels: " + JSON.stringify(_submodels.length, null, 4)));

// 			let scalar_submodels = [];
// 			let sets_submodels = [];

// 			const preffered_order = ["name", "url", "published", "denomination", "region", "sector", "operation_date", "operation_subtype", "operation_type", "nation_cible", "keywords", "amount", "amount_int", "ca", "ca_annee", "detention_time", "ebit_da", "ebit_da_year", "fi_equity", "interne_comment", "m_ca", "nb_advice", "nbre_societe", "nbre_sorties", "percentage_sale", "pourcentage_acquisition", "valorisation", "last_update_analyst", "endpoint"];

// 			_submodels = _submodels.sort((a, b) => preffered_order.indexOf(a?.tail as string) - preffered_order.indexOf(b?.tail as string));

// 			for (let submodel of _submodels) {
// 				if (!submodel) {
// 					yield* _(Effect.logInfo("No submodel"));

// 					continue;
// 				}

// 				const interfaces = yield* _(submodel.provided_interfaces());

// 				// yield* _(Effect.logInfo("Submodel : " + submodel.path + " : " + interfaces?.[0]?.interface));

// 				if (interfaces.map((i) => i.interface.includes("Set"))) {
// 					const property_sources = yield* _(submodel.features(CATEGORY.PROPERTY_SOURCE));

// 					for (let property_source of property_sources) {
// 						let templates = yield* _(property_source.model.features(CATEGORY.SET_TEMPLATE));

// 						// yield* _(Effect.logInfo("Template: " + templates?.[0]?.model.path));

// 						let template = templates?.[0]?.model.path;

// 						if (["string", "number", "boolean", undefined].includes(template)) {
// 							scalar_submodels.push({
// 								relative_path: submodel.tail,
// 								label: submodel.label,
// 								interfaces: interfaces.map((i) => i.interface),
// 							});
// 						} else {
// 							yield* _(Effect.logInfo("Template: " + template));
// 							sets_submodels.push({
// 								relative_path: submodel.tail,
// 								label: submodel.label,
// 								interfaces: interfaces.map((i) => i.interface),
// 							});
// 						}
// 					}
// 				} else {
// 					scalar_submodels.push({
// 						relative_path: submodel.tail,
// 						label: submodel.label,
// 						interfaces: interfaces.map((i) => i.interface),
// 					});
// 				}
// 			}

// 			// const entity_submodels = ["company_name", "siret"];
// 			// const people_submodels = ["email", "name", "linkedin"];

// 			scalar_submodels = scalar_submodels.sort((a, b) => (a.relative_path || "").localeCompare(b.relative_path || ""));
// 			sets_submodels = sets_submodels.sort((a, b) => (a.relative_path || "").localeCompare(b.relative_path || ""));

// 			// sort by alphabetical tail property
// 			for (let submodel of scalar_submodels) {
// 				yield* _(Effect.logInfo("Scalar submodel: " + submodel.label));
// 			}

// 			for (let submodel of sets_submodels) {
// 				yield* _(Effect.logInfo("Set submodel: " + submodel.label));
// 			}

// 			for (let submodel of scalar_submodels) {
// 				header += submodel.label + ",";
// 			}

// 			header = "name (contact),company_role,company_name,siret,email,linkedin," + header;

// 			// name (contact)	company_role	company_name	siret	email	linkedin	name

// 			// for (let submodel of entity_submodels) {
// 			// 	header += submodel + ",";
// 			// }

// 			// for (let submodel of people_submodels) {
// 			// 	header += submodel + ",";
// 			// }

// 			// header += "people_role";

// 			// for (let submodel of people_submodels) {
// 			// 	header += submodel + ",";
// 			// }

// 			header = header.substring(0, header.length - 1);

// 			header += "\n";

// 			// header += submodels.map((submodel) => submodel.label).join(",") + "\n";

// 			// yield* _(Effect.logInfo("Submodels: " + JSON.stringify(submodels, null, 4)));

// 			let has_more = true;
// 			let page = 1;
// 			let page_size = 50;

// 			const _results: (string | null)[][] = [];

// 			while (has_more) {
// 				const new_rows = yield* _(ant.it2_direct_instances(undefined, undefined, page, page_size));

// 				for (let row of new_rows) {
// 					let data: (string | null)[] = [
// 						// row.path.split("_")[0], row.path.split("_")[1]
// 					];

// 					const row_submodels = yield* _(row.submodels());

// 					for (let scalar_submodel of scalar_submodels) {
// 						const interfaces = scalar_submodel.interfaces;
// 						if (interfaces.includes("String")) {
// 							const value = yield* _(row_submodels.find((s) => s.tail === scalar_submodel.relative_path)?.string_value() || Effect.succeed(null));
// 							data.push(value || "");
// 						} else if (interfaces.includes("Number")) {
// 							// const value = yield* _(row.number_value(submodel.relative_path || undefined));
// 							const value = yield* _(row_submodels.find((s) => s.tail === scalar_submodel.relative_path)?.number_value() || Effect.succeed(null));
// 							data.push(value?.toString() || "");
// 						} else if (interfaces.includes("Boolean")) {
// 							// const value = yield* _(row.boolean_value(submodel.relative_path || undefined));
// 							const value = yield* _(row_submodels.find((s) => s.tail === scalar_submodel.relative_path)?.boolean_value() || Effect.succeed(null));
// 							data.push(value?.toString() || "");
// 						} else {
// 							let string_array_value = yield* _(row_submodels.find((s) => s.tail === scalar_submodel.relative_path)?.string_array_value() || Effect.succeed(null));
// 							if (string_array_value) {
// 								data.push(string_array_value.length ? string_array_value.join(" | ") : "");
// 							} else {
// 								data.push("");
// 							}

// 							// data.push("");
// 						}
// 					}

// 					for (let set_submodel of sets_submodels) {
// 						const set = yield* _(row_submodels.find((s) => s.tail === set_submodel.relative_path)?.as_set() || Effect.succeed(null));

// 						const exploitable_data = [...data];

// 						if (set) {
// 							const elements = yield* _(set.get_n(50));
// 							let operation_people = [];
// 							let acteurs = [];
// 							let societies = [];

// 							for (let element of elements) {
// 								const endpoint = yield* _(element.string_value("endpoint"));

// 								if (endpoint?.includes("people")) {
// 									operation_people.push(element);
// 								} else if (endpoint?.includes("acteur")) {
// 									acteurs.push(element);
// 								} else if (endpoint?.includes("societie")) {
// 									societies.push(element);
// 								}
// 							}

// 							// if (!people.length) {
// 							// 	continue;
// 							// }

// 							let companies = [...acteurs, ...societies];

// 							for (let company of companies) {
// 								const related_people = yield* _(company.at("related_people").pipe(Effect.flatMap((a) => a?.as_set() || Effect.succeed(null))));

// 								const people = yield* _(related_people?.get_n(50) || Effect.succeed([]));

// 								let company_name = yield* _(company.string_value("name"));
// 								let siret = yield* _(company.string_value("siret"));

// 								for (let person of people) {
// 									if (operation_people.map((p) => p.path).includes(person.path)) {
// 										let person_name = yield* _(person.string_value("name"));
// 										let person_email = yield* _(person.string_value("email"));
// 										let person_linkedin = yield* _(person.string_value("linkedin"));

// 										//"name (contact),company_role,company_name,siret,email,linkedin,name,"

// 										//set_submodel.label
// 										//company_name || "", siret || "", person_name || "", person_email || "", person_linkedin || ""

// 										let company_role = get_company_role_label(set_submodel.label);

// 										const new_data = [person_name || "", company_role, company_name, siret || "", person_email || "", person_linkedin || "", ...exploitable_data];

// 										const d = new_data.map((d) => (d ? d.replace(/, /g, " | ").replace(/[\n\r]/g, " | ") : ""));

// 										if (new_data.includes("https://www.cfnews.net/Annuaires-base-de-deals/Base-de-deals/LBO-BIZOUARD-PATRIMOINE-EIP-PATRIMOINE-PATER-FAMILIAS-mardi-19-decembre-2023")) {
// 											console.log("NEW DATA", d, d.length);
// 										}

// 										_results.push(d);
// 									}
// 								}
// 							}
// 						}
// 					}

// 					// _results.push(data.map((d) => d?.replace(/, /g, " | ") || ""));
// 					yield* _(csv_export_ant.set_number_value_at("handled", handled() + 1));
// 					increment_handled();
// 				}

// 				// for (let row of new_rows) {

// 				// }

// 				has_more = new_rows.length === page_size;
// 				yield* _(Effect.logInfo("Handled: " + handled() + " / " + total()));

// 				page++;

// 				// yield* _(Effect.logInfo("Page " + page + " has_more: " + has_more));
// 			}

// 			// let csv_content = "data:text/csv;charset=utf-8,";

// 			let csv_content = "";

// 			csv_content += header;

// 			const header_operation_date_index = header.split(",").findIndex((h) => h === "operation_date");

// 			csv_content += _results
// 				.sort((a, b) => {
// 					const a_operation_date = a[header_operation_date_index];
// 					const b_operation_date = b[header_operation_date_index];

// 					return new Date(b_operation_date || "").getTime() - new Date(a_operation_date || "").getTime();
// 				})
// 				.map((row) => row.join(",").replace(/\/n/g, " | "))
// 				.join("\n");

// 			// yield* _(Effect.logInfo("CSV CONTENT: " + csv_content));

// 			const buffer = Buffer.from(csv_content, "utf-8");

// 			yield* _(Effect.tryPromise({ try: async () => await uploadFileToS3(buffer, bucketName, id + ".csv"), catch: (e) => Effect.logError(e) }));

// 			const f = yield* _(Ant.from_path("file"));

// 			if (!f) {
// 				throw new Error("No file");
// 			}

// 			const file_ant = yield* _(f.instantiate());

// 			if (!file_ant) {
// 				throw new Error("No file ant");
// 			}

// 			const presigned_url = yield* _(
// 				Effect.tryPromise(() =>
// 					getSignedUrl(
// 						s3,
// 						new GetObjectCommand({
// 							Bucket: bucketName,
// 							Key: id + ".csv",
// 						}),
// 						{ expiresIn: 60 * 60 * 24 },
// 					),
// 				),
// 			);

// 			yield* _(file_ant.set_string_value_at("format", "csv"));
// 			yield* _(file_ant.set_number_value_at("size", buffer.length));
// 			yield* _(file_ant.set_string_value_at("bucket", bucketName));
// 			yield* _(file_ant.set_string_value_at("key", id + ".csv"));
// 			yield* _(file_ant.set_string_value_at("state", "uploaded"));
// 			yield* _(file_ant.set_string_value_at("presigned_url", presigned_url));

// 			yield* _(Effect.logInfo("Presigned URL: " + presigned_url));
// 			yield* _(Effect.logInfo("File ant: " + file_ant.path));
// 			yield* _(Effect.logInfo("Format: " + "csv"));
// 			yield* _(Effect.logInfo("Size: " + buffer.length));
// 			yield* _(Effect.logInfo("Bucket: " + bucketName));
// 			yield* _(Effect.logInfo("Key: " + id + ".csv"));
// 			yield* _(Effect.logInfo("State: " + "uploaded"));

// 			yield* _(csv_export_ant.at("file").pipe(Effect.flatMap((a) => a?.set_reference(file_ant.path) || Effect.succeed(null))));

// 			// yield* _(Effect.logInfo("Buffer: " + buffer.toString()));

// 			return ant;
// 		});
// 	}
// }

// // uploadFileToS3(buffer, bucketName, fileName);

// function get_company_role_label(value: string) {
// 	let map: {
// 		[key: string]: string;
// 	} = {
// 		buyer_bloc: "Acquéreur(s) ou Investisseur(s)",
// 		buyer_dd_finance: "Acq. DD Financière",
// 		lawyer_buyer: "Acquéreur Avocat Corporate",
// 		lawyer_solder: "Cédant Avocat Corporate",
// 		banker_solder: "Cédant Banquier d'Affaires / Conseil M&A",
// 		banker_buyer: "Acquéreur Banquier d'Affaires / Conseil M&A",
// 		banker_company: "Société Banquier d'Affaires / Conseil M&A",
// 		banker_senior: "Dette senior",
// 		buyer_dd_juridique: "Acq. DD Juridique et Fiscale",
// 		buyer_dd_social: "Acq. DD Sociale",
// 		lawyer_senior: "Dette Avocat",
// 		solder_bloc: "Cédant(s)",
// 		council_3: "Société DD Financière",
// 		due_diligence_all_aspect: "VDD Financière",
// 		buyer_dd_propriety: "Acq. DD Propriété Intellectuelle",
// 		concil_6: "Acq. Avocat d'Affaires Fiscal",
// 		concil_2: "Conseil Financement",
// 		banker_all: "Acq. Avocats d'Affaires Financement",
// 		buyer_dd_other: "Acq. DD Autres",
// 		buyer_dd_concurrence: "Acq. Avocat d'Affaires Concurrence",
// 		concil_8: "Cédant Avocat d'Affaires Financement",
// 	};

// 	if (map[value]) return map[value];

// 	return value;
// }
