import {mockWithVideo, mockWithImage} from './libs/camera-mock.js';
import {loadGLTF, loadTexture, loadTextures, loadVideo} from './libs/loader.js';
const THREE = window.MINDAR.IMAGE.THREE;

const width = 1;
const height = 1;

document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('startButton');
  startButton.addEventListener('click', async () => {
    startButton.style.display = 'none'; // Hide the start button

    const start = async() => {

      // initialize MindAR 
      const mindarThree = new window.MINDAR.IMAGE.MindARThree({
        container: document.body, 
        filterMinCF: 0.0001, 
        filterBeta: 0.0001, 
        uiLoading: '#loading', 
        imageTargetSrc: './content/targets.mind',
      });
      const {renderer, cssRenderer, scene, cssScene, camera} = mindarThree;
  
      const light = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );
      scene.add(light);
  
      const anchor = mindarThree.addAnchor(0);
  
      
      const gltfPaths = [
        './content/bfs-export.gltf',
      ];
    
      // Define the positions of your models
      const positions = [
          {x: 0, y: 0, z: 0.2},
          // Add more positions as needed
      ];
    
      // This will hold the loaded glTF scenes and their corresponding mixers
      let gltfs = [];
    
      // Load each glTF file
      for (let i = 0; i < gltfPaths.length; i++) {
          const gltf = await loadGLTF(gltfPaths[i]);
    
          // Apply the transformations to the scene
          gltf.scene.scale.set(0, 0, 0);
          gltf.scene.position.set(positions[i].x, positions[i].y, positions[i].z);
          if(height >= width){
            gltf.scene.rotation.set(0, 3 * Math.PI / 2, 0);
          } else {
            gltf.scene.rotation.set(1 * Math.PI / 2, 0, 1 * Math.PI / 2);
          }
          
    
          // Create a mixer for the animations
          const mixer = new THREE.AnimationMixer(gltf.scene);
    
          // Play all the animations
          for (let animation of gltf.animations) {
              const action = mixer.clipAction(animation);
              action.play();
          }
    
          // Store the glTF scene and its mixer
          gltfs.push({scene: gltf.scene, mixer});
      }
  
      function createRoundedRectShape(x, y, width, height, radius) {
        const roundedRectShape = new THREE.Shape();
    
        roundedRectShape.moveTo( x, y + radius );
        roundedRectShape.lineTo( x, y + height - radius );
        roundedRectShape.quadraticCurveTo( x, y + height, x + radius, y + height );
        roundedRectShape.lineTo( x + width - radius, y + height);
        roundedRectShape.quadraticCurveTo( x + width, y + height, x + width, y + height - radius );
        roundedRectShape.lineTo( x + width, y + radius );
        roundedRectShape.quadraticCurveTo( x + width, y, x + width - radius, y );
        roundedRectShape.lineTo( x + radius, y );
        roundedRectShape.quadraticCurveTo( x, y, x, y + radius );
    
        return roundedRectShape;
      }
    
      function createExtrudedGeometry(shape, depth = -0.01, bevelEnabled = false) {
        return new THREE.ExtrudeGeometry(shape, {
            depth: depth,
            bevelEnabled: bevelEnabled
        });
      }
  
      //BCG SOLID GEOM
      const x=-(width/2), y=-(height/2), radius=0.12;
      const roundedRectShape = createRoundedRectShape(x, y, width, height, radius);
      const geometry1 = createExtrudedGeometry(roundedRectShape);
      const gradientTexture = await loadTexture("./content/glass_gradient.png");
      const material = new THREE.MeshBasicMaterial({ 
        map: gradientTexture,  // White color
        transparent: true, 
        opacity: 0.6  // Semi-transparent
      });
      const plane = new THREE.Mesh(geometry1, material);
      plane.position.set(0,0,0.2);
      plane.material.opacity = 0;
  
      // VIDEO PLANE
      const video = await loadVideo("./content/rickyzee.mp4")
      video.muted = true;
      video.loop = true; // make the video loop
      const videoTexture = new THREE.VideoTexture(video);
      video.play();
  
      const geometry2 = new THREE.PlaneGeometry(width, height);
      const maskTexture = await loadTexture("./content/mask_corners.png");
      videoTexture.encoding = THREE.sRGBEncoding;
      const videoMaterial = new THREE.MeshBasicMaterial({
        map: videoTexture,
        alphaMap: maskTexture, 
        transparent: true
      });
      const planeVideo = new THREE.Mesh(geometry2, videoMaterial);
   
      planeVideo.position.set(0,0,0.201);
      const videoScaleY = 1-(0.05/height);
      const videoScaleX = 1-(0.05/width);
      planeVideo.scale.set(videoScaleX,videoScaleY,1);
      planeVideo.material.opacity = 0;  
  
      // OUTLINE STROKE
      const geometry3 = new THREE.PlaneGeometry(width,height);
      const material2 = new THREE.MeshBasicMaterial({ 
        color: 0xA3A3A3,  // White color
        transparent: true, 
        opacity: 0  // Semi-transparent
      });
      const plane2 = new THREE.Mesh(geometry3, material2);
      plane2.position.set(0,0,0.2);
      // Create the outline stroke
      const edges = new THREE.EdgesGeometry(plane.geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 1 }); // set the color of the outline here
      const lines = new THREE.LineSegments(edges, lineMaterial);
      plane2.add(lines);
      plane2.scale.set(0,0,0);
  
      const clock = new THREE.Clock();
  
      gltfs.forEach((gltf) => {
        anchor.group.add(gltf.scene);
      });
      anchor.group.add(plane);
      anchor.group.add(planeVideo);
      anchor.group.add(plane2);
      
  
      await mindarThree.start();
  
      let scale = 0;
      let elapsedTime = 0; // Time passed since the start of the animation loop
      let startScaling = false;
  
      renderer.setAnimationLoop(() => {
        videoTexture.needsUpdate = true;
        const delta = clock.getDelta();
        elapsedTime += delta;
  
        if(elapsedTime > 0){
          startScaling = true;
        }
  
        if (startScaling && scale < 1) {
          scale += delta * 1; // adjust 0.1 to change the speed of the animation
          plane2.scale.x = scale;
          plane2.scale.y = scale;
        }
        if(scale>1){
          plane2.scale.x = 1;
          plane2.scale.y = 1;
        }
  
        if (elapsedTime > 2 && elapsedTime < 2.1) {
          // From 2 seconds to 2.1 seconds, make the plane visible
          plane.material.opacity = 0.4;
        } else if (elapsedTime >= 2.1 && elapsedTime < 2.2) {
          // From 2.1 seconds to 2.2 seconds, make the plane transparent again
          plane.material.opacity = 0;
        } else if (elapsedTime >= 2.2) {
          // After 2.2 seconds, make the plane permanently visible
          planeVideo.material.opacity = 1;
          plane.material.opacity = 0.6;
        }
  
        if(elapsedTime > 2.5){
          gltfs.forEach((gltf) => {
            if(height >= width){
              if(height > 1.5){
                gltf.scene.scale.set(0.075,(height/1.78)*0.075,0.075);
              } else {
                gltf.scene.scale.set(0.075,(1.5/1.78)*0.075,0.075);
              }
            } else {
              if(width > 1.5){
                gltf.scene.scale.set(0.075,(width/1.78)*0.075,0.075);
              } else {
                gltf.scene.scale.set(0.075,(1.5/1.78)*0.075,0.075);
              }
              
            }
            
          });
        }
  
        gltfs.forEach((gltf) => {
          gltf.mixer.update(delta);
        });
  
        renderer.render(scene,camera);
      });
    }

    await start();
  });
});

document.addEventListener('DOMContentLoaded', () => {
  
  start();
});
