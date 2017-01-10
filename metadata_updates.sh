#!/bin/bash


DIRECTORY=`dirname $0`
echo $DIRECTORY


source $DIRECTORY/processes.sh 

node_file=$1

is_running=false
for process in "${usgs_api_processes[@]}"
do
  #if[ps -ax | grep $i | grep -v grep]
  numprocesses=$(ps -ax | grep $process | grep -v grep | grep -v metadata_updates.sh | wc -l) 
  if [[ $numprocesses -gt 0 ]] ; then 
   is_running=true
   echo "working on $process."
  fi
done

if $is_running ; then
  echo 'you CANNOT run a proccess'
else
 echo 'running ' $node_file
 cd $DIRECTORY
 node $node_file
fi 
