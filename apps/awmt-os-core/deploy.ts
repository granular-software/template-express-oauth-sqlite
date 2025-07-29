import { AllocateAddressCommand, AllocateAddressCommandOutput, AssociateAddressCommand, AuthorizeSecurityGroupIngressCommand, CreateSecurityGroupCommand, CreateSubnetCommand, CreateVpcCommand, DescribeVpcsCommand, EC2Client, RunInstancesCommand, RunInstancesCommandInput, Subnet, Vpc, _InstanceType } from "@aws-sdk/client-ec2";
import { IAMClient } from "@aws-sdk/client-iam";
import { CreateBucketCommand, PutBucketTaggingCommand, S3Client } from "@aws-sdk/client-s3";
import { snakeCase } from "snake-case";

const region = "eu-west-3";

const ec2 = new EC2Client({ region });
const iam = new IAMClient({ region });
const s3 = new S3Client({ region });

deploy("lmdc");

export default async function deploy(customer_name: string) {
	const name = snakeCase(customer_name.toLowerCase().replace(/-/g, ""));

	const { vpc, subnet } = await create_vpc(name);

    console.log("got vpc, subnet")

	const { allocated } = await create_elastic_ip(name);

	const { backend_instance, security_group_id } = await create_backend(name, vpc, allocated);

	const { db_main } = await create_database_instances(name, vpc, subnet, security_group_id);
}

async function create_vpc(name: string) {
	// const vpc_command = new CreateVpcCommand({
	// 	CidrBlock: "10.0.0.0/16",
	// 	TagSpecifications: [
	// 		{
	// 			ResourceType: "vpc",

	// 			Tags: [
	// 				{
	// 					Key: "Customer",
	// 					Value: name,
	// 				},
	// 			],
	// 		},
	// 	],
	// });

	// const vpc = await ec2.send(vpc_command);

	const command = new DescribeVpcsCommand({});
	const response = await ec2.send(command);

    const vpc = response?.Vpcs?.[0] 

    console.log(vpc?.VpcId)

    if(!vpc) throw "VPC not found"

	const subnet_command = new CreateSubnetCommand({
		VpcId: vpc.VpcId,
        CidrBlock: "172.31.0.0/16"
	});

	const subnet = await ec2.send(subnet_command);

	if (!subnet || !subnet.Subnet) throw "Could not create subnet";

	console.log("VPC Created: ", vpc.VpcId);
	console.log("Subnet Created: ", subnet.Subnet?.SubnetId);

	return {
		vpc: vpc,
		subnet: subnet.Subnet,
	};
}

async function create_elastic_ip(name: string) {
	const allocated = await ec2.send(
		new AllocateAddressCommand({
			Domain: "vpc",
			TagSpecifications: [
				{
					ResourceType: "elastic-ip",
					Tags: [
						{
							Key: "Customer",
							Value: name,
						},
					],
				},
			],
		}),
	);

	console.log("Elastic IP Created:", allocated);
	console.log("Elastic IP Address:", allocated.PublicIp);
	console.log("Allocation ID:", allocated.AllocationId);

	return { allocated };
}

async function create_backend(name: string, vpc: Vpc, allocated: AllocateAddressCommandOutput) {
	const security_group_response = await ec2.send(
		new CreateSecurityGroupCommand({
			Description: "Security group for backend instance",
			GroupName: `${name}-sg`,
			VpcId: vpc.VpcId,
		}),
	);
	const security_group_id = security_group_response.GroupId;
	console.log("Security Group Created with ID:", security_group_id);

	if (!security_group_id) throw "Could not create security group";

	await ec2.send(
		new AuthorizeSecurityGroupIngressCommand({
			GroupId: security_group_id,
			IpPermissions: [
				{
					IpProtocol: "tcp",
					FromPort: 80,
					ToPort: 80,
					IpRanges: [{ CidrIp: "0.0.0.0/0" }],
				},
				{
					IpProtocol: "tcp",
					FromPort: 443,
					ToPort: 443,
					IpRanges: [{ CidrIp: "0.0.0.0/0" }],
				},
			],
		}),
	);

	const ec2_response = await ec2.send(
		new RunInstancesCommand({
			ImageId: "ami-03f12ae727bb56d85",
			InstanceType: "t2.nano",
			KeyName: "bckend_key",
			SecurityGroupIds: [security_group_id],
			MinCount: 1,
			MaxCount: 1,
			UserData: Buffer.from(
				`#!/bin/bash
        curl -fsSL https://bun.sh/install | bash
        yum install git -y
        `,
			).toString("base64"),

			TagSpecifications: [
				{
					ResourceType: "instance",
					Tags: [
						{
							Key: "Customer",
							Value: name,
						},
						{
							Key: "Name",
							Value: `backend-${name}`,
						},
					],
				},
			],
		}),
	);

	if (!ec2_response || !ec2_response.Instances) throw "Could not create EC2 Backend";

	const instance = ec2_response.Instances[0];

	const instance_id = instance.InstanceId;
	console.log("EC2 Instance Created with ID:", instance_id);

	await ec2.send(
		new AssociateAddressCommand({
			AllocationId: allocated.AllocationId,
			InstanceId: instance_id,
		}),
	);

	console.log("Elastic IP associated with Instance:", instance_id);








        // Create .env with db ip, pw
        // Get from github and launch











	return {
		backend_instance: instance,
		security_group_id: security_group_id,
	};
}

async function create_database_instances(name: string, vpc: Vpc, subnet: Subnet, security_gorup_id: string) {
	const get_instance_command = (instance_name: string, data_script: string) =>
		({
			ImageId: "ami-03f12ae727bb56d85",
			InstanceType: "t2.micro" as _InstanceType,
			KeyName: "backend_key",
			SecurityGroupIds: [security_gorup_id],
			SubnetId: subnet.SubnetId,
			MinCount: 1,
			MaxCount: 1,
			UserData: Buffer.from(data_script).toString("base64"),
			TagSpecifications: [
				{
					ResourceType: "instance",
					Tags: [
						{
							Key: "Customer",
							Value: name,
						},
						{
							Key: "Name",
							Value: `${instance_name}-${name}`,
						},
					],
				},
			],
		} as RunInstancesCommandInput);

	const db_main_command = get_instance_command(
		"db-main",
		`#!/bin/bash
    yum update -y
    amazon-linux-extras install docker
    service docker start
    usermod -a -G docker ec2-user
    // docker run -d your-docker-image // Replace with your Docker image
    docker run –name primary –rm -p 6379:6379 falkordb/falkordb`,
	);

	// const db_replica_command = get_instance_command(
	// 	"db-replica-1",
	// 	`#!/bin/bash
	//     yum update -y
	//     amazon-linux-extras install docker
	//     service docker start
	//     usermod -a -G docker ec2-user
	//     docker run -d your-docker-image // Replace with your Docker image`,
	// );

	const db_main = await ec2.send(new RunInstancesCommand(db_main_command));

	// const db_replica = await ec2.send(new RunInstancesCommand(db_replica_command));

	if (!db_main || !db_main.Instances) throw "Could not create database instances";
	// if (!db_main || !db_main.Instances || !db_replica || !db_replica.Instances) throw "Could not create database instances";

	console.log("Database Main Instance Created with ID:", db_main.Instances[0].InstanceId);
	// console.log("Database Replica Instance Created with ID:", db_replica.Instances[0].InstanceId);

	return {
		db_main: db_main.Instances[0],
		// db_replica: db_replica.Instances[0]
	};
}

async function create_s3_bucket(name: string, bucket_type: "files" | "backups") {
	const bucket_name = `${name}-${bucket_type}`;
	const bucket = await s3.send(
		new CreateBucketCommand({
			Bucket: bucket_name,
		}),
	);

	await s3.send(
		new PutBucketTaggingCommand({
			Bucket: bucket_name,
			Tagging: {
				TagSet: [
					{
						Key: "Customer",
						Value: name,
					},
				],
			},
		}),
	);
}

// async function create_keys_management_system(name: string) {}