docker build --pull -t awmt-bg .
docker tag awmt-bg:latest 493550511128.dkr.ecr.eu-west-3.amazonaws.com/awmt-background:latest
aws ecr get-login-password --region eu-west-3 | docker login --username AWS --password-stdin 493550511128.dkr.ecr.eu-west-3.amazonaws.com/awmt-background
docker push 493550511128.dkr.ecr.eu-west-3.amazonaws.com/awmt-background:latest