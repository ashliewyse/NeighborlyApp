import React from 'react';
import {createRoot} from 'react-dom/client';
import {UserProfileView,BusinessProfileView} from '../../src/app/App';
import '../../src/styles/index.css';
import {AreaReviewPanel} from '../../src/app/components/AreaReviewPanel';
const profile={id:'crop-test-owner',name:'Test Neighbor',city:'Test City',neighborhood:'Test Area',joinDate:'October 2026',bio:'Personal profile regression preview',badges:[],posts:0,neighbors:0,helpfulVotes:0,recsGiven:0,rating:0,ratingCount:0,neighborReviews:[],galleryPhotos:[],recentActivity:[]};
const biz={id:1,name:'Test Business',category:'Services',city:'Test City',rating:0,reviewCount:0,badges:[],description:'Business regression preview',services:[],photos:[],phone:'',email:'',website:'',address:'',hours:[],founded:'',owner:'Test Owner',reviews:[]};
const params=new URLSearchParams(location.search);
createRoot(document.getElementById('root')!).render(params.has('areas')?<AreaReviewPanel/>:params.has('business')?<BusinessProfileView biz={biz} onBack={()=>{}} onUserClick={()=>{}}/>:<UserProfileView profile={profile} isOwnProfile={params.has('own')} onBack={()=>{}}/>);
