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
                sh 'git clone git@github.com:skyerus/chat-socket.git'
            }
        }
        stage('Building image') {
          steps{
            script {
                dockerImage = docker.build("${env.registry}:build-${BUILD_NUMBER}", "--no-cache ./chat-socket")
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
            sh "rm -Rf chat-socket"
          }
        }
    }
}