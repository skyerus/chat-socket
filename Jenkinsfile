pipeline {
    agent any
    environment {
        registry = "eu.gcr.io/riptides/chat-socket"
        registryUrl = "https://eu.gcr.io/riptides"
        dockerImage = ''
    }
    stages {
        stage('Cloning Git') {
            steps {
                sh 'rm -rf *'
                git (
                        url: 'git@github.com:skyerus/chat-socket.git',
                        credentialsId: 'github',
                        branch: 'master'
                    )
            }
        }
        stage('Building image') {
          steps{
            script {
                dockerImage = docker.build("${env.registry}:build-${BUILD_NUMBER}", "--no-cache .")
            }
          }
        }
        stage('Deploy Image') {
          steps{
            script {
                docker.withRegistry( registryUrl, 'gcr:riptides-gcr' ) {
                    dockerImage.push()
                }
            }
          }
        }
        stage('Remove Unused docker image & git repo') {
          steps{
            sh "docker rmi $registry:build-$BUILD_NUMBER"
            sh "rm -Rf"
          }
        }
    }
}