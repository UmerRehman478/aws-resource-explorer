import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Ec2View from '../views/Ec2View.vue'
import S3View from '../views/S3View.vue'
import LambdaView from '../views/LambdaView.vue'
import IamView from '../views/IamView.vue'
import VpcView from '../views/VpcView.vue'
import DynamoDbView from '../views/DynamoDbView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/ec2', name: 'ec2', component: Ec2View },
    { path: '/s3', name: 's3', component: S3View },
    { path: '/lambda', name: 'lambda', component: LambdaView },
    { path: '/iam', name: 'iam', component: IamView },
    { path: '/vpc', name: 'vpc', component: VpcView },
    { path: '/dynamodb', name: 'dynamodb', component: DynamoDbView },
  ],
})

export default router